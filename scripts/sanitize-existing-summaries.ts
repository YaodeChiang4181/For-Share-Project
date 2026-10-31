import { prisma } from "../src/lib/prisma";
import { cleanSummaryOutput } from "../src/lib/ai";

async function main() {
  console.log("Starting cleanup of existing summaries in database...");
  const posts = await prisma.post.findMany({
    where: {
      content: {
        contains: "內容要點提煉",
      },
    },
  });

  console.log(`Found ${posts.length} posts with summaries to inspect.`);

  for (const post of posts) {
    const rawContent = post.content || "";
    const markerMatch = rawContent.match(/^(?:>\s*\[\s*內容要點提煉\s*\]|\*\*AI 摘要懶人包\*\*|>\s*\[\s*內容摘要\s*\])\s*\n+/);

    if (markerMatch) {
      const rest = rawContent.slice(markerMatch[0].length).trim();
      const lastDividerIdx = rest.lastIndexOf("\n---");

      let summaryPart = rest;
      let authorPart = "";

      if (lastDividerIdx !== -1) {
        summaryPart = rest.slice(0, lastDividerIdx).trim();
        authorPart = rest.slice(lastDividerIdx + 4).trim();
      }

      const cleanedSummary = cleanSummaryOutput(summaryPart);

      let finalContent = `> [ 內容要點提煉 ]\n\n${cleanedSummary}`;
      if (authorPart && authorPart !== post.title) {
        finalContent += `\n\n---\n\n${authorPart}`;
      }

      if (finalContent !== rawContent) {
        await prisma.post.update({
          where: { id: post.id },
          data: { content: finalContent },
        });
        console.log(`Updated post [${post.id}]: "${post.title}" with sanitized content.`);
      } else {
        console.log(`Post [${post.id}] is already clean.`);
      }
    }
  }

  console.log("Cleanup finished successfully!");
}

main()
  .catch((e) => {
    console.error("Cleanup error:", e);
    process.exit(1);
  });
