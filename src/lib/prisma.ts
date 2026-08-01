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

  if (!connectionString || !connectionString.startsWith("postgres") || connectionString.length < 30) {
    console.error("[prisma.ts] ❌ DATABASE_URL 無效或未設定:", connectionString || "(空)");
    return new PrismaClient({ log: ["error"] });
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
