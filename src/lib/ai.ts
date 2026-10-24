import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;
function getAi() {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiInstance;
}

/**
 * 參考「商業故事產生器」的多模型累退降級清單
 * 當主力模型遇配額限制 (429)、臨時中斷 (503) 或冷啟動延遲時，自動無縫輪替
 */
const MODELS_TO_TRY = [
  "gemini-2.5-flash",      // 速度與摘要品質平衡的主力模型
  "gemini-3.7-flash",      // 新世代高智能模型
  "gemini-flash-latest",   // 動態最新穩定版本
  "gemini-2.5-flash-lite", // 輕量低延遲備援
  "gemini-3.5-flash",      // 舊版穩定備援
  "gemini-3.8-flash",      // 延伸備用
  "gemini-3.6-flash",      // 延伸備用
  "gemini-2.5-pro",        // 高階模型最終防線
];

interface CallGeminiOptions {
  contents: string;
  temperature?: number;
  responseMimeType?: string;
  responseSchema?: unknown;
}

/**
 * 執行多模型輪迴發送與指數退避重試機制
 */
export async function callGeminiWithRetry(options: CallGeminiOptions, maxRounds = 3): Promise<string> {
  const ai = getAi();
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("找不到 GEMINI_API_KEY 環境變數");
  }

  let lastError: unknown = null;

  for (let round = 1; round <= maxRounds; round++) {
    for (const model of MODELS_TO_TRY) {
      try {
        console.log(`[AI 輪迴機制] 第 ${round} 輪嘗試模型: ${model}`);
        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: {
            temperature: options.temperature ?? 0.5,
            responseMimeType: options.responseMimeType,
            responseSchema: options.responseSchema,
          },
        });

        if (response && response.text) {
          console.log(`[AI 輪迴機制] 模型 ${model} 成功產出回應！`);
          return response.text;
        }
      } catch (err: unknown) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[AI 輪迴機制] 模型 ${model} 請求失敗 (${msg})，依序輪替至下一備用模型...`);
      }
    }

    // 若整輪備用模型均拋出異常，進行指數退避等待後進入下一輪
    if (round < maxRounds) {
      const waitMs = Math.min(1000 * Math.pow(2, round - 1), 6000);
      console.log(`[AI 輪迴機制] 第 ${round} 輪所有備選模型皆嘗試失敗，指數退避等待 ${waitMs}ms 後進入下一輪輪迴...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw lastError || new Error("所有備用模型均無法回應，請確認 API 配額或網路連線。");
}

export async function generateSummary(text: string): Promise<string> {
  if (!text || text.trim() === '') {
    return '無法提供摘要：沒有可用的文字內容。';
  }

  const prompt = `
你是一位專業的大學課業與考研助教。請針對以下文字內容，進行「二級資訊統合」，並產生一份精確的「摘要重點」。

要求：
1. 擷取核心考點、時程、重點概念、或最重要的結論。
2. 必須以 Markdown 格式輸出，使用條列式排版。
3. 語氣需專業且精簡，便於大學生快速閱讀。
4. 字數盡量控制在 500 字以內。
5. 請直接輸出摘要內容，不要加上「好的」、「以下是摘要」等無意義的開頭。

以下是需要摘要的內容：
${text.substring(0, 15000)}
`;

  try {
    const textOutput = await callGeminiWithRetry({
      contents: prompt,
      temperature: 0.5,
    });

    return textOutput.trim() || '無法生成摘要。';
  } catch (error) {
    console.error('Error generating AI summary through model rotation:', error);
    return '生成摘要時發生錯誤，請稍後再試。';
  }
}

export async function moderateContent(text: string): Promise<{ flagged: boolean; reason: string }> {
  if (!text || text.trim() === '') {
    return { flagged: false, reason: '' };
  }

  const prompt = `
你是一位嚴格的內容審核員。請判斷以下文字是否屬於「侵犯版權內容（例如：原版題庫、直接複製的教授簡報）」或「無意義的垃圾內容」。
請只回傳 JSON 格式，不要加上 Markdown 的 \`\`\`json 標籤，格式如下：
{
  "flagged": true或false,
  "reason": "如果flagged為true，請簡短說明原因，否則留空"
}

審核內容：
${text.substring(0, 5000)}
`;

  try {
    const responseText = await callGeminiWithRetry({
      contents: prompt,
      temperature: 0.2,
      responseMimeType: "application/json",
    });
    
    let result = responseText || "{}";
    // 清理可能的 Markdown 標記
    result = result.replace(/```json/g, "").replace(/```/g, "").trim();

    return JSON.parse(result) as { flagged: boolean; reason: string };
  } catch (error) {
    console.error('Error moderating content through model rotation:', error);
    // 發生錯誤時預設不阻擋，避免系統中斷
    return { flagged: false, reason: '' };
  }
}
