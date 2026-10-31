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
  "gemini-3.8-flash",          // 最新推薦主力高速模型
  "gemini-3.7-flash",          // 新世代高智能模型
  "gemini-3.5-flash",          // 穩定備援
  "gemini-3.5-flash-lite",     // 輕量低延遲備援
  "gemini-flash-latest",       // 動態最新版本
  "gemini-3.1-pro-preview",    // 高階推理模型備援
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
        const apiCall = ai.models.generateContent({
          model,
          contents: options.contents,
          config: {
            temperature: options.temperature ?? 0.5,
            responseMimeType: options.responseMimeType,
            responseSchema: options.responseSchema,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`模型 ${model} 請求逾時 (超過 12 秒)`)), 12000)
        );

        const response = await Promise.race([apiCall, timeoutPromise]);

        if (response && response.text) {
          console.log(`[AI 輪迴機制] 模型 ${model} 成功產出回應！`);
          return response.text;
        }
      } catch (err: unknown) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[AI 輪迴機制] 模型 ${model} 請求失敗 (${msg})，依序輪替至下一備用模型...`);
        if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
          console.log("[AI 輪迴機制] 偵測到速率配額限制 (Free Tier)，智慧降速暫停 10 秒...");
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }
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

/**
 * 徹底清洗 AI 產生的摘要文字：
 * 1. 轉換 <h1>~<h6> 標籤為標準 Markdown 標題 (### )
 * 2. 轉換 <b> / <strong> 標籤為 **
 * 3. 剝除任何殘存的 HTML 標籤（防 XSS 與避免符號露餡）
 * 4. 嚴格貫徹 Zero-Emoji 規範，去除所有表情符號
 * 5. 規範化連續空行
 */
export function cleanSummaryOutput(text: string): string {
  if (!text) return "";
  return text
    // 轉換常見標籤為 Markdown
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, "\n\n### $1\n\n")
    .replace(/<\/?h[1-6][^>]*>/gi, "\n\n### ")
    .replace(/<\/?(b|strong)[^>]*>/gi, "**")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "* $1\n")
    .replace(/<\/?(ul|ol|p|div|span)[^>]*>/gi, "\n")
    // 移除其餘任何 HTML 標籤
    .replace(/<\/?[a-zA-Z0-9_-]+(?:\s+[^>]*?)?>/g, "")
    // 嚴格 Zero-Emoji 去除
    .replace(/[\u{10000}-\u{10ffff}\u2600-\u27bf\u2300-\u23ff\u2b50-\u2b55\u203c-\u2049]/gu, "")
    // 移除多餘空白行
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function generateSummary(text: string): Promise<string> {
  if (!text || text.trim() === '') {
    return '無法提供摘要：沒有可用的文字內容。';
  }

  const prompt = `
你是一位專業的大學課業與考研助教。請針對以下文字內容，進行「二級資訊統合」，並產生一份精確的「摘要重點」。

要求：
1. 擷取核心考點、時程、重點概念、或最重要的結論。
2. 必須以純 Markdown 格式輸出，使用清晰的階層與條列式排版。
3. 【格式禁令】：嚴禁輸出任何 HTML 標籤（如 <h4>, <p>, <b>, <span> 等），一律使用標準 Markdown 語法（如 ###, ####, *, -）。
4. 【視覺禁令】：嚴格遵守零表情符號（Zero-Emoji）原則，嚴禁使用任何 Emoji 圖示（如 📊, 📝, 💡, 📌, ✨ 等）。
5. 語氣需專業且精簡，便於大學生快速閱讀。
6. 字數盡量控制在 500 字以內。
7. 請直接輸出摘要內容，不要加上「好的」、「以下是摘要」等無意義的開頭。

以下是需要摘要的內容：
${text.substring(0, 15000)}
`;

  try {
    const textOutput = await callGeminiWithRetry({
      contents: prompt,
      temperature: 0.5,
    });

    const cleaned = cleanSummaryOutput(textOutput);
    return cleaned || '無法生成摘要。';
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

export interface StructuredTags {
  department: string;
  academicYear: string;
  noteType: string;
}

/**
 * 萃取 10~20 個語意標籤（含考點、主題、關鍵詞、同義字），作為前端隱藏標籤輔助搜尋
 */
export async function generateTags(text: string): Promise<string[]> {
  if (!text || text.trim() === '') return [];

  const prompt = `
你是一位校園知識索引與關鍵詞分析專家。請根據以下學習筆記內容，產生 10~20 個精確且利於大學生搜尋的「語意關聯標籤」。

要求：
1. 標籤應涵蓋：科目名稱、重要章節主題、核心考點/專有名詞、縮寫與口語同義詞（例如：「計算機概論」同時納入「計概」「CS101」）。
2. 請只回傳 JSON 字串陣列，格式為 ["標籤1", "標籤2", ...]。
3. 每個標籤 2~8 個字，不要包含特殊標點符號或 Markdown 語法。
4. 請直接輸出 JSON 陣列，不要加上任何開頭或結尾說明文字。

筆記內容：
${text.substring(0, 10000)}
`;

  try {
    const responseText = await callGeminiWithRetry({
      contents: prompt,
      temperature: 0.3,
      responseMimeType: "application/json",
    });

    const cleaned = (responseText || "[]").replace(/```json/g, "").replace(/```/g, "").trim();
    const tags = JSON.parse(cleaned);
    return Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20) : [];
  } catch (error) {
    console.error('Error generating AI tags through model rotation:', error);
    return [];
  }
}

/**
 * 從筆記內容中自動補位未填寫的三大結構化標籤（系所、學年度、類型）
 */
export async function detectStructuredTags(
  text: string,
  missingFields: (keyof StructuredTags)[]
): Promise<Partial<StructuredTags>> {
  if (!text || text.trim() === '' || missingFields.length === 0) {
    return {};
  }

  const fieldGuides: Record<keyof StructuredTags, string> = {
    department: '系所名稱（例如：資管系、電機系、中文系、企管系、通識）',
    academicYear: '學年度或學期（例如：112、113-1、111下）',
    noteType: '筆記類型，只能嚴格選擇下列其中一項：[ 考試整理, 上課筆記, 考古題, 重點摘要, 專題/作業, 其他 ]',
  };

  const requestedFieldList = missingFields
    .map((f) => `"${f}": "${fieldGuides[f]}"`)
    .join(',\n  ');

  const prompt = `
你是一位大學教務與文件分類專家。請研讀以下筆記內容，自動判別並補位下列空缺欄位：
{
  ${requestedFieldList}
}

規則：
1. 僅回傳符合 JSON 格式的物件，鍵值為上面要求的欄位名稱。
2. 若內容中完全無法可靠推論某欄位，該鍵值請設為空字串 ""。
3. noteType 必須嚴格落在指定清單之一。
4. 不要輸出 Markdown 程式碼區塊標記，只輸出純 JSON。

筆記內容：
${text.substring(0, 8000)}
`;

  try {
    const responseText = await callGeminiWithRetry({
      contents: prompt,
      temperature: 0.2,
      responseMimeType: "application/json",
    });

    const cleaned = (responseText || "{}").replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned) as Partial<StructuredTags>;
  } catch (error) {
    console.error('Error detecting structured tags through model rotation:', error);
    return {};
  }
}

