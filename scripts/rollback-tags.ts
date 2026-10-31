import "dotenv/config";
import { prisma } from "../src/lib/prisma";

/**
 * 伺服器端標籤維護與緊急回滾工具 (CLI Tag Quarantine & Rollback Tool)
 * 使用方式：
 *   npx tsx scripts/rollback-tags.ts --audit         (檢查目前所有標籤健康度)
 *   npx tsx scripts/rollback-tags.ts --reset-all     (緊急清空所有 AI 產生的標籤)
 *   npx tsx scripts/rollback-tags.ts --post=<ID>     (針對單一文章進行隔離重置)
 */
async function main() {
  const args = process.argv.slice(2);
  const isAudit = args.includes("--audit");
  const isResetAll = args.includes("--reset-all");
  const postArg = args.find((a) => a.startsWith("--post="));
  const targetPostId = postArg ? postArg.split("=")[1] : null;

  if (targetPostId) {
    console.log(`[隔離操作] 正在重置單一筆記標籤: ${targetPostId}...`);
    const post = await prisma.post.update({
      where: { id: targetPostId },
      data: {
        department: null,
        academicYear: null,
        noteType: null,
        aiTags: null,
      },
    });
    console.log(`[成功] 筆記 "${post.title}" 標籤已全數清空與隔離。`);
    return;
  }

  if (isResetAll) {
    console.log("[危急操作] 正在執行全域標籤回滾...");
    const res = await prisma.post.updateMany({
      data: {
        aiTags: null,
      },
    });
    console.log(`[完成] 已成功清空 ${res.count} 篇筆記之 AI 語意標籤。`);
    return;
  }

  // 預設為健檢模式 (--audit)
  console.log("=== ForShare 標籤資料庫安全性與健康度檢驗 ===");
  const posts = await prisma.post.findMany({
    select: {
      id: true,
      title: true,
      department: true,
      academicYear: true,
      noteType: true,
      aiTags: true,
    },
  });

  console.log(`總筆記數: ${posts.length}`);
  let taggedCount = 0;
  let sensitiveCount = 0;

  for (const p of posts) {
    if (p.department || p.noteType || p.aiTags) taggedCount++;
    if (p.aiTags && (p.aiTags.includes("<") || p.aiTags.includes("script") || p.aiTags.includes("admin"))) {
      sensitiveCount++;
      console.warn(`[警告] 發現可疑標籤文章 [${p.id}]: "${p.title}" -> ${p.aiTags}`);
    }
  }

  console.log(`已建立標籤筆記數: ${taggedCount} / ${posts.length}`);
  console.log(`可疑標籤數: ${sensitiveCount}`);
  console.log("健檢完成，系統安全正常！");
}

main().catch(console.error);
