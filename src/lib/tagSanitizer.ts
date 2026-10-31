/**
 * ForShare AI 標籤安全沙箱與淨化過濾模組 (Tag Sanitizer Sandbox)
 * 責任：防禦提示注入(Prompt Injection)、XSS 標籤投毒、個資外洩(PII)與前端白屏崩潰
 */

export const ALLOWED_NOTE_TYPES = [
  "考試整理",
  "上課筆記",
  "考古題",
  "重點摘要",
  "專題/作業",
  "其他",
] as const;

export type AllowedNoteType = typeof ALLOWED_NOTE_TYPES[number];

// 阻擋關鍵系統管理與特權保留字 (防止搜尋劫持與偽裝)
const SYSTEM_RESERVED_WORDS = new Set([
  "admin",
  "administrator",
  "system",
  "vip",
  "share_vip",
  "root",
  "auth",
  "token",
  "password",
  "bypass",
  "sql",
  "select",
  "insert",
  "script",
  "alert",
  "eval",
]);

// 個資遮蔽正規表達式
const PII_PHONE_REGEX = /09\d{2}[-\s]?\d{3}[-\s]?\d{3}/g;
const PII_EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PII_TW_ID_REGEX = /[A-Z][12]\d{8}/g;

/**
 * 清除危險字元、HTML 標籤與控制字元
 */
export function cleanRawText(str: string): string {
  if (!str) return "";
  return str
    .replace(/<[^>]*>/g, "") // 移除所有 HTML 標籤
    .replace(/[\r\n\t\0\x08]/g, " ") // 移除換行與控制字元
    .replace(/[`"'\\<>{}[\]]/g, "") // 移除引號、反引號與括號
    .replace(/\s+/g, " ") // 壓縮連續空白
    .trim();
}

/**
 * 檢查是否含有個資或敏感關鍵字
 */
export function containsSensitiveData(text: string): boolean {
  if (!text) return false;
  if (PII_PHONE_REGEX.test(text)) return true;
  if (PII_EMAIL_REGEX.test(text)) return true;
  if (PII_TW_ID_REGEX.test(text)) return true;

  const lower = text.toLowerCase().trim();
  if (SYSTEM_RESERVED_WORDS.has(lower)) return true;

  return false;
}

/**
 * 淨化「系所」欄位
 * 規則：2~12 字元，純文字，不可含特殊字元或敏感詞
 */
export function sanitizeDepartment(dept: string | null | undefined): string | null {
  if (!dept) return null;
  const cleaned = cleanRawText(dept);
  if (cleaned.length < 2 || cleaned.length > 12) return null;
  if (containsSensitiveData(cleaned)) return null;
  return cleaned;
}

/**
 * 淨化「學年度」欄位
 * 規則：僅接受合法的民國學年（如 108~120、113-1、112下）
 */
export function sanitizeAcademicYear(year: string | null | undefined): string | null {
  if (!year) return null;
  const cleaned = cleanRawText(year).replace(/\s+/g, "");
  // 檢驗格式：100~129，可選 -1、-2、上、下
  const yearPattern = /^1[0-2][0-9](-?[1-2]|上|下)?$/;
  if (!yearPattern.test(cleaned)) return null;
  return cleaned;
}

/**
 * 淨化「筆記類型」欄位
 * 規則：必須嚴格符合枚舉白名單
 */
export function sanitizeNoteType(type: string | null | undefined): string | null {
  if (!type) return null;
  const cleaned = cleanRawText(type);
  if (ALLOWED_NOTE_TYPES.includes(cleaned as AllowedNoteType)) {
    return cleaned;
  }
  return null;
}

/**
 * 淨化「AI 語意標籤」字串陣列
 * 規則：
 * 1. 數量上限：最多 12 個
 * 2. 單詞長度：2~10 字
 * 3. 排除重複、包含個資或危險保留字之標籤
 */
export function sanitizeAiTags(tags: string[] | null | undefined): string[] {
  if (!Array.isArray(tags)) return [];

  const safeTagsSet = new Set<string>();

  for (const rawTag of tags) {
    if (typeof rawTag !== "string") continue;
    const cleaned = cleanRawText(rawTag);

    // 長度限制
    if (cleaned.length < 2 || cleaned.length > 10) continue;

    // 個資與保留字檢測
    if (containsSensitiveData(cleaned)) continue;

    safeTagsSet.add(cleaned);

    // 達到安全數量上限即停止
    if (safeTagsSet.size >= 12) break;
  }

  return Array.from(safeTagsSet);
}

/**
 * 安全解析前端傳入或資料庫儲存之 aiTags JSON 字串
 * 徹底防止 JSON.parse 異常導致前端 React 白屏
 */
export function safeParseAiTags(rawJson: string | null | undefined): string[] {
  if (!rawJson || typeof rawJson !== "string") return [];
  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch {
    return [];
  }
}
