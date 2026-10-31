import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Checking and updating Post table schema...");
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "department" TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "academicYear" TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "noteType" TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "aiTags" TEXT;
  `);

  console.log("Post table columns updated successfully!");
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    // done
  });
