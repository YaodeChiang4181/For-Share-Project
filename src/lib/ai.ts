import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;
function getAi() {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiInstance;
}

export async function generateSummary(text: string): Promise<string> {
  if (!text || text.trim() === '') {
    return '無法提供摘要：沒有可用的文字內容。';
  }

  const prompt = `
你是一位專業的大學課業與考研助教。請針對以下文字內容，進行「二級資訊統合」，並產生一份精確的「摘要懶人包」。

要求：
1. 擷取核心考點、時程、獎學金資格、或最重要的結論。
2. 必須以 Markdown 格式輸出，使用條列式排版。
3. 語氣需專業且精簡，便於大學生快速閱讀。
4. 字數盡量控制在 500 字以內。
5. 請直接輸出摘要內容，不要加上「好的」、「以下是摘要」等無意義的開頭。

以下是需要摘要的內容：
${text.substring(0, 15000)} // 避免超過 token 上限，擷取前面部分
`;

  try {
    const response = await getAi().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || '無法生成摘要。';
  } catch (error) {
    console.error('Error generating AI summary:', error);
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
    const response = await getAi().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    let result = response.text || "{}";
    // 清理可能的 Markdown 標記
    result = result.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();

    return JSON.parse(result) as { flagged: boolean; reason: string };
  } catch (error) {
    console.error('Error moderating content:', error);
    // 發生錯誤時預設不阻擋，避免系統中斷
    return { flagged: false, reason: '' };
  }
}
