import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  _prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
  
  if (!url || typeof url !== "string" || url.length < 10) {
    throw new Error(`[ForShare 終極除錯] Vercel 根本沒有讀到 DATABASE_URL！目前讀到的值是: ${url}`);
  }

  // 暫時移除 Neon Serverless Adapter，直接使用標準 Prisma 連線
  // 這可以幫助我們釐清到底是 Neon Adapter 的問題，還是環境變數的問題
  return new PrismaClient({ log: ["error"] });
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma._prisma) {
      globalForPrisma._prisma = createPrismaClient();
    }
    return (globalForPrisma._prisma as unknown as Record<string | symbol, unknown>)[prop];
  },
});
