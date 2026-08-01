import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  _prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Trim to remove any accidental trailing newlines from Vercel env vars
  let connectionString = (process.env.DATABASE_URL || process.env.POSTGRES_URL || "").trim();

  // 移除使用者在 Vercel 貼上時可能不小心帶入的雙引號或單引號
  connectionString = connectionString.replace(/^["']|["']$/g, "").trim();

  // 1. 檢查是否完全為空
  if (!connectionString) {
    throw new Error("🚨 系統找不到資料庫連線網址！請到 Vercel 的 Environment Variables 設定 DATABASE_URL");
  }

  // 2. 檢查開頭是否正確
  if (!connectionString.startsWith("postgres")) {
    throw new Error(`🚨 DATABASE_URL 格式錯誤！您的網址必須以 postgres 開頭。您目前設定的是: ${connectionString.substring(0, 15)}...`);
  }

  // 3. 檢查長度是否太短 (避免使用者只貼了 postgresql://)
  if (connectionString.length < 30) {
    throw new Error(`🚨 DATABASE_URL 太短了！您可能沒有貼完整。請確認有包含密碼與 neondb。`);
  }

  try {
    // 使用 WebSocket Pool (PrismaNeon) 取代 Http，以支援 interactive transactions ($transaction)
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    return new PrismaClient({ adapter, log: ["error"] });
  } catch (err: any) {
    console.error("Prisma init error:", err);
    throw new Error(`🚨 資料庫連線字串解析失敗，請確保您貼上的 DATABASE_URL 是完整且正確的。詳細錯誤: ${err.message}`);
  }
}

// Lazy initialization using Proxy - prevents any DB connection during Next.js build phase
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!globalForPrisma._prisma) {
      globalForPrisma._prisma = createPrismaClient();
    }
    return (globalForPrisma._prisma as any)[prop];
  }
});

if (process.env.NODE_ENV !== "production") {
  // Safe for development HMR - prevents creating multiple clients during hot reload
}
