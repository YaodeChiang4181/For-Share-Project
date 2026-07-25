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
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  // In build environments, if URL is missing or malformed, use standard client to avoid Neon parse errors
  if (!connectionString || !connectionString.includes("@")) {
    return new PrismaClient();
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool as any);
  return new PrismaClient({ adapter, log: ["error"] });
}

// Lazy initialization using Proxy ensures no DB connections or parse errors happen during build-time module imports
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!globalForPrisma._prisma) {
      globalForPrisma._prisma = createPrismaClient();
    }
    return (globalForPrisma._prisma as any)[prop];
  }
});

if (process.env.NODE_ENV !== "production") {
  // We can't assign Proxy to the global directly in the same way, but it's safe to just let Proxy handle it
}
