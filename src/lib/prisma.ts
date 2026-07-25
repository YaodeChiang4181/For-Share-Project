import { PrismaClient } from "@prisma/client";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

// Set up WebSocket constructor for Neon in Node.js environments
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  _prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Trim the connection string to remove any accidental trailing newlines from Vercel env vars
  const connectionString = (process.env.DATABASE_URL || process.env.POSTGRES_URL || "").trim();

  // In build environments, if URL is missing or malformed, return empty client
  // Prisma 7 requires an adapter, so we pass a dummy if missing
  if (!connectionString || !connectionString.includes("@")) {
    return new PrismaClient({ log: ["error"] });
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool as any);
  return new PrismaClient({ adapter, log: ["error"] });
}

// Lazy initialization using Proxy
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!globalForPrisma._prisma) {
      globalForPrisma._prisma = createPrismaClient();
    }
    return (globalForPrisma._prisma as any)[prop];
  }
});

if (process.env.NODE_ENV !== "production") {
  // Safe for development HMR
}
