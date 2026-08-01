import { PrismaClient } from "@prisma/client";

// =============================================================================
// Prisma Client - Lazy Initialization via Proxy
// =============================================================================
// 所有 Neon/WebSocket 相關的 import 都使用 require() 延遲載入。
// 這樣 Vercel 在 Build 階段（npm run build）就不會因為找不到 DATABASE_URL 而崩潰。
// =============================================================================

const globalForPrisma = globalThis as unknown as {
  _prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  /* eslint-disable @typescript-eslint/no-require-imports */
  // 動態 require 避免 build 階段載入這些模組
  const { Pool, neonConfig } = require("@neondatabase/serverless");
  const { PrismaNeon } = require("@prisma/adapter-neon");
  const ws = require("ws");
  /* eslint-enable @typescript-eslint/no-require-imports */

  neonConfig.webSocketConstructor = ws;

  let connectionString = (process.env.DATABASE_URL || process.env.POSTGRES_URL || "").trim();

  // 移除使用者在 Vercel 貼上時可能不小心帶入的雙引號或單引號
  connectionString = connectionString.replace(/^["']|["']$/g, "").trim();

  if (!connectionString || !connectionString.startsWith("postgres") || connectionString.length < 30 || !connectionString.includes("@")) {
    const isSet = typeof process.env.DATABASE_URL === "string";
    const rawLength = isSet ? process.env.DATABASE_URL?.length : 0;
    
    throw new Error(
      `[環境變數錯誤] DATABASE_URL 無效或未在 Production 環境正確載入！\n` +
      `請前往 Vercel > Settings > Environment Variables 確認變數是否已勾選 Production，並且已經重新 Deploy。\n\n` +
      `除錯資訊:\n` +
      `- 原始變數是否存在: ${isSet ? "是" : "否"}\n` +
      `- 原始字串長度: ${rawLength}\n` +
      `- 處理後字串長度: ${connectionString.length}\n` +
      `- 字串前綴: ${connectionString.substring(0, 12)}...`
    );
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool);
  return new PrismaClient({ adapter, log: ["error"] });
}

// Lazy initialization using Proxy - 在 Next.js build 階段不會觸發任何資料庫連線
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma._prisma) {
      globalForPrisma._prisma = createPrismaClient();
    }
    return (globalForPrisma._prisma as unknown as Record<string | symbol, unknown>)[prop];
  },
});
