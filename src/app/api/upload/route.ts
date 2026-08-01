export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import fs from "fs";
import { generateSummary, moderateContent } from "@/lib/ai";
import { extractTextFromPDF } from "@/lib/pdfExtract";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "未登入，請先登入後再上傳" }, { status: 401 });
    }

    const formData = await req.formData();
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const isPaidStr = formData.get("isPaid") as string;
    const tagsStr = formData.get("tags") as string;
    const file = formData.get("file") as File;

    if (!title || !file) {
      return NextResponse.json({ error: "標題與檔案為必填項目" }, { status: 400 });
    }

    const isPaid = isPaidStr === "true";

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const originalExt = path.extname(file.name);
    
    // 為了相容 Vercel 的唯讀檔案系統 (Read-only Serverless function)，
    // 我們直接將檔案轉為 Base64 Data URI 存入資料庫，避免寫入 /public/uploads 失敗。
    const mimeType = file.type || "application/octet-stream";
    const base64Data = buffer.toString("base64");
    const fileUrl = `data:${mimeType};base64,${base64Data}`;

    // --- AI 摘要懶人包處理 ---
    let textToSummarize = content || "";
    if (originalExt.toLowerCase() === ".pdf") {
      const extractedText = await extractTextFromPDF(buffer);
      if (extractedText) {
        textToSummarize = extractedText;
      }
    }
    
    // --- Phase 2: 第一層 AI 內容審核 ---
    if (textToSummarize) {
      const moderation = await moderateContent(textToSummarize);
      if (moderation.flagged) {
        return NextResponse.json(
          { error: `上傳失敗，內容審核未通過：${moderation.reason}` },
          { status: 400 }
        );
      }
    }
    
    let finalContent = content;
    if (textToSummarize) {
      const aiSummary = await generateSummary(textToSummarize);
      finalContent = `> ✨ **AI 摘要懶人包**\n\n${aiSummary}\n\n---\n\n${content}`;
    }
    // ----------------------

    // 使用 Transaction 確保寫入文章與給予獎勵同時成功
    const post = await prisma.$transaction(async (tx) => {
      const newPost = await tx.post.create({
        data: {
          title,
          content: finalContent,
          isPaid,
          fileUrl,
          category: tagsStr || "未分類",
          authorId: session.user.id,
        },
      });

      // 檢查邀請獎勵 (實質互動防弊)
      const currentUser = await tx.user.findUnique({ where: { id: session.user.id } });
      if (currentUser && currentUser.invitedById && !currentUser.hasClaimedInviteReward) {
        // 給予當前使用者 10 點
        await tx.user.update({
          where: { id: currentUser.id },
          data: { points: { increment: 10 }, hasClaimedInviteReward: true }
        });
        await tx.transactionRecord.create({
          data: {
            userId: currentUser.id,
            type: "EARN_INVITE",
            amount: 10,
            description: "完成首次實質互動，獲得邀請獎勵"
          }
        });

        // 檢查邀請人是否領過
        const inviter = await tx.user.findUnique({ where: { id: currentUser.invitedById } });
        if (inviter && !inviter.inviteRewardReceived) {
          await tx.user.update({
            where: { id: inviter.id },
            data: { points: { increment: 10 }, inviteRewardReceived: true }
          });
          await tx.transactionRecord.create({
            data: {
              userId: inviter.id,
              type: "EARN_INVITE",
              amount: 10,
              description: `您邀請的朋友 ${currentUser.name} 已完成首次互動，獲得獎勵`
            }
          });
        }
      }

      return newPost;
    });

    return NextResponse.json(
      { message: "上傳成功", post },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "伺服器錯誤，請稍後再試" },
      { status: 500 }
    );
  }
}
