import crypto from "crypto";

// 系統級靜態 Salt，用於防止彩虹表反查
const ANONYMIZATION_SALT = process.env.NEXTAUTH_SECRET || "forshare-default-salt-2026";

/**
 * 將敏感識別碼（如學號、User ID、IP 等）透過加鹽 SHA-256 轉為不可逆的去識別化代碼
 * 產出格式範例：`ID-A7F9C2`
 */
export function hashIdentifier(identifier: string | null | undefined, prefix = "ID"): string {
  if (!identifier) return `${prefix}-ANON`;
  const hash = crypto
    .createHmac("sha256", ANONYMIZATION_SALT)
    .update(identifier)
    .digest("hex");
  return `${prefix}-${hash.substring(0, 8).toUpperCase()}`;
}

/**
 * 遮罩學號 (例: 110403521 -> 110****21)
 */
export function maskStudentId(studentId: string | null | undefined): string {
  if (!studentId) return "未提供";
  const clean = studentId.trim();
  if (clean.length <= 4) return clean;
  const start = clean.substring(0, 3);
  const end = clean.substring(clean.length - 2);
  return `${start}****${end}`;
}

/**
 * 遮罩電子郵件 (例: student123@cc.ncu.edu.tw -> s***3@cc.ncu.edu.tw)
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "匿名訪客";
  const parts = email.split("@");
  if (parts.length !== 2) return "******";
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) {
    return `${name[0]}*@${domain}`;
  }
  const first = name[0];
  const last = name[name.length - 1];
  return `${first}***${last}@${domain}`;
}

/**
 * 遮罩中文姓名 (例: 王小明 -> 王*明、歐陽大華 -> 歐**華)
 */
export function maskRealName(name: string | null | undefined): string {
  if (!name) return "匿名同學";
  const trimmed = name.trim();
  if (trimmed.length <= 1) return trimmed;
  if (trimmed.length === 2) return `${trimmed[0]}*`;
  return `${trimmed[0]}${"*".repeat(trimmed.length - 2)}${trimmed[trimmed.length - 1]}`;
}

/**
 * 產出去識別化合規標章與中繼資訊
 */
export function getAnonymizationMetadata() {
  return {
    isDeIdentified: true,
    compliance: "台灣個人資料保護法 (PDPA) & 校園學術倫理規範",
    anonymizationMethod: "Salted HMAC-SHA-256 + PII Masking",
    piiStatus: "ZERO_RAW_PII",
    timestamp: new Date().toISOString(),
  };
}
