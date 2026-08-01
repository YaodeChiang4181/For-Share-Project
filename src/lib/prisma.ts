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

  // 檢查是否為無效字串 (例如真的被存成 "undefined" 字串)
  if (!connectionString || connectionString === "undefined" || connectionString === "null" || !connectionString.startsWith("postgres")) {
    console.error("無效的資料庫連線字串 (Invalid DATABASE_URL):", connectionString);
    return new PrismaClient({ log: ["error"] });
  }

  try {
    // 使用 WebSocket Pool (PrismaNeon) 取代 Http，以支援 interactive transactions ($transaction)
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    return new PrismaClient({ adapter, log: ["error"] });
  } catch (err) {
    console.error("Prisma init error:", err);
    return new PrismaClient({ log: ["error"] });
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
