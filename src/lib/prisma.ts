import { PrismaClient } from "@prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  _prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Trim to remove any accidental trailing newlines from Vercel env vars
  const connectionString = (process.env.DATABASE_URL || process.env.POSTGRES_URL || "").trim();

  // In build environments with no URL, return a bare client (won't connect but won't crash on import)
  if (!connectionString) {
    return new PrismaClient({ log: ["error"] });
  }

  try {
    // Use HTTP transport (PrismaNeonHttp) instead of WebSocket Pool.
    // This avoids pg-connection-string parsing entirely and works reliably on Vercel Node.js.
    // Second arg is required HTTPQueryOptions: arrayMode and fullResults are mandatory fields.
    const adapter = new PrismaNeonHttp(connectionString, { arrayMode: true, fullResults: true });
    return new PrismaClient({ adapter, log: ["error"] });
  } catch {
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
