import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const posts = await prisma.post.findMany({
    select: {
      id: true,
      title: true,
      category: true,
      department: true,
      academicYear: true,
      noteType: true,
      aiTags: true,
    },
  });

  console.log("Current Posts Status:");
  console.log(JSON.stringify(posts, null, 2));
}

main().catch(console.error);
