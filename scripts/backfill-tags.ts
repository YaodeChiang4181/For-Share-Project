import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { generateTags, detectStructuredTags, StructuredTags } from "../src/lib/ai";

async function main() {
  console.log("Starting backfill for existing posts...");
  const posts = await prisma.post.findMany({
    where: {
      OR: [
        { department: null },
        { academicYear: null },
        { noteType: null },
        { aiTags: null },
      ],
    },
  });

  console.log(`Found ${posts.length} posts requiring tag backfill.`);

  for (const post of posts) {
    console.log(`Processing post [${post.id}]: "${post.title}"...`);
    const textToAnalyze = `${post.title}\n\n${post.category || ""}\n\n${post.content || ""}`;

    const missingFields: (keyof StructuredTags)[] = [];
    if (!post.department) missingFields.push("department");
    if (!post.academicYear) missingFields.push("academicYear");
    if (!post.noteType) missingFields.push("noteType");

    const [aiTags, detected] = await Promise.all([
      !post.aiTags ? generateTags(textToAnalyze) : Promise.resolve([]),
      missingFields.length > 0
        ? detectStructuredTags(textToAnalyze, missingFields)
        : Promise.resolve({} as Partial<StructuredTags>),
    ]);

    const updateData: any = {};
    if (!post.department && detected.department) updateData.department = detected.department;
    if (!post.academicYear && detected.academicYear) updateData.academicYear = detected.academicYear;
    if (!post.noteType && detected.noteType) updateData.noteType = detected.noteType;
    if (!post.aiTags && aiTags.length > 0) updateData.aiTags = JSON.stringify(aiTags);

    if (Object.keys(updateData).length > 0) {
      await prisma.post.update({
        where: { id: post.id },
        data: updateData,
      });
      console.log(`Updated post [${post.id}] with:`, updateData);
    } else {
      console.log(`No new tags inferred for post [${post.id}].`);
    }

    // Free Tier 節流保護：每篇處理後休息 6 秒
    await new Promise((r) => setTimeout(r, 6000));
  }

  console.log("Backfill completed successfully!");
}

main()
  .catch((e) => {
    console.error("Backfill error:", e);
    process.exit(1);
  });
