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

  // In build environments, if URL is missing, return client without adapter
  if (!connectionString) {
    return new PrismaClient({ log: ["error"] });
  }

  try {
    // Use Node's built-in URL parser to manually extract connection components.
    // This completely bypasses the buggy pg-connection-string parser inside @neondatabase/serverless.
    const parsed = new URL(connectionString);

    const pool = new Pool({
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port) : 5432,
      database: parsed.pathname.replace(/^\//, ""),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      ssl: true, // Always require SSL for Neon
      max: 1, // Limit connections for serverless
    });

    const adapter = new PrismaNeon(pool as any);
    return new PrismaClient({ adapter, log: ["error"] });
  } catch {
    // If URL parsing fails entirely, fall back to a no-adapter client
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
