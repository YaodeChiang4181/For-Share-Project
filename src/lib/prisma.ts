import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  _prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { neonConfig } = require("@neondatabase/serverless");
  const { PrismaNeon } = require("@prisma/adapter-neon");
  const ws = require("ws");
  /* eslint-enable @typescript-eslint/no-require-imports */

  neonConfig.webSocketConstructor = ws;

  const url = (process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || "").trim();
  const connectionString = url.replace(/^["']|["']$/g, "").trim();

  if (!connectionString) {
    throw new Error("[ForShare 錯誤] 找不到資料庫連線字串 (DATABASE_URL)。請檢查 Vercel 環境變數。");
  }

  // 最新版的 PrismaNeon 接收的是 PoolConfig 物件，而不是 Pool 實體！
  const adapter = new PrismaNeon({ connectionString });
  
  return new PrismaClient({ adapter, log: ["error"] });
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma._prisma) {
      globalForPrisma._prisma = createPrismaClient();
    }
    return (globalForPrisma._prisma as unknown as Record<string | symbol, unknown>)[prop];
  },
});
