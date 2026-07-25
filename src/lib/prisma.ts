import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  _prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  // In build environments, if URL is missing or malformed, return empty client
  if (!connectionString) {
    return new PrismaClient();
  }

  // Use standard Prisma engine, bypassing the buggy @neondatabase/serverless adapter
  // Pass the URL dynamically since schema.prisma lacks the url field
  return new PrismaClient({
    datasources: {
      db: {
        url: connectionString,
      },
    },
    log: ["error"],
  });
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
