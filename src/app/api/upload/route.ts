export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import fs from "fs";
import { generateSummary, moderateContent, generateTags, detectStructuredTags, StructuredTags } from "@/lib/ai";
import {
  sanitizeDepartment,
  sanitizeAcademicYear,
  sanitizeNoteType,
  sanitizeAiTags,
} from "@/lib/tagSanitizer";
import { extractTextFromPDF } from "@/lib/pdfExtract";
import { lineClient } from "@/lib/line-bot";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// 初始化 S3 Client (如果環境變數有設定的話)
const s3 = process.env.S3_ENDPOINT ? new S3Client({
  region: "auto", // Cloudflare R2 必須設定為 auto
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  }
}) : null;

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
    const tagsStr = (formData.get("tags") as string) || "";
    const departmentInput = (formData.get("department") as string) || "";
    const academicYearInput = (formData.get("academicYear") as string) || "";
    const noteTypeInput = (formData.get("noteType") as string) || "";
    const file = formData.get("file") as File;

    if (!title || !file) {
      return NextResponse.json({ error: "標題與檔案為必填項目" }, { status: 400 });
    }

    const isPaid = isPaidStr === "true";

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const originalExt = path.extname(file.name);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = `note-${uniqueSuffix}${originalExt}`;
    const mimeType = file.type || "application/octet-stream";
    
    let fileUrl = "";

    // 如果有設定 S3，就上傳到 R2
    if (s3 && process.env.S3_BUCKET_NAME) {
      await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: filename,
        Body: buffer,
        ContentType: mimeType,
      }));
      // R2 預設的 S3 API URL (若未設定 public domain，後續可能需要 presigned URL 或設定公開 R2.dev 網址)
      fileUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/${filename}`;
    } else {
      // 為了相容 Vercel 的唯讀檔案系統 (Read-only Serverless function)，
      // 且沒有 S3 的情況下，轉為 Base64 Data URI 作為 fallback。
      const base64Data = buffer.toString("base64");
      fileUrl = `data:${mimeType};base64,${base64Data}`;
    }

    // --- AI 摘要與內容提煉 ---
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
    let aiTagsJson: string | null = null;
    let finalDepartment = departmentInput.trim();
    let finalAcademicYear = academicYearInput.trim();
    let finalNoteType = noteTypeInput.trim();

    if (textToSummarize) {
      // 找出哪些結構化欄位未手動填寫，需要 AI 自動補位
      const missingFields: (keyof StructuredTags)[] = [];
      if (!finalDepartment) missingFields.push("department");
      if (!finalAcademicYear) missingFields.push("academicYear");
      if (!finalNoteType) missingFields.push("noteType");

      // 並行執行：1. 摘要 2. 語意隱藏標籤 3. 空缺結構欄位補位
      const [aiSummary, aiTags, detectedTags] = await Promise.all([
        generateSummary(textToSummarize),
        generateTags(textToSummarize),
        missingFields.length > 0
          ? detectStructuredTags(textToSummarize, missingFields)
          : Promise.resolve({} as Partial<StructuredTags>),
      ]);

      finalContent = content && content.trim()
        ? `> [ 內容要點提煉 ]\n\n${aiSummary}\n\n---\n\n${content}`
        : `> [ 內容要點提煉 ]\n\n${aiSummary}`;

      // 使用者手填優先；若未填才採納 AI 自動補位結果
      if (!finalDepartment && detectedTags.department) {
        finalDepartment = detectedTags.department;
      }
      if (!finalAcademicYear && detectedTags.academicYear) {
        finalAcademicYear = detectedTags.academicYear;
      }
      if (!finalNoteType && detectedTags.noteType) {
        finalNoteType = detectedTags.noteType;
      }

      // 安全沙箱淨化：防止 Prompt 注入、XSS 關鍵字與個資外洩
      const safeTags = sanitizeAiTags(aiTags);
      if (safeTags.length > 0) {
        aiTagsJson = JSON.stringify(safeTags);
      }
    }

    // 對所有最終欄位進行白名單與規格驗證
    const cleanDept = sanitizeDepartment(finalDepartment);
    const cleanYear = sanitizeAcademicYear(finalAcademicYear);
    const cleanType = sanitizeNoteType(finalNoteType);

    const compositeCategory = [cleanDept, cleanType, tagsStr].filter(Boolean).join(", ") || tagsStr || "未分類";

    // 使用 Transaction 確保寫入文章與給予獎勵同時成功
    const post = await prisma.$transaction(async (tx) => {
      const newPost = await tx.post.create({
        data: {
          title,
          content: finalContent,
          isPaid,
          fileUrl,
          category: compositeCategory,
          department: cleanDept,
          academicYear: cleanYear,
          noteType: cleanType,
          aiTags: aiTagsJson,
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

    // --- LINE 推播通知給管理員 ---
    try {
      const admins = await prisma.user.findMany({
        where: {
          role: "ADMIN",
          lineId: { not: null },
        }
      });
      
      if (admins.length > 0) {
        const uploaderName = session.user.name || "某位使用者";
        const messageText = `[ 新筆記上傳通知 ]\n\n使用者 ${uploaderName} 剛剛上傳了一份新筆記：\n「${title}」\n\n請前往後台查看審核：\n${process.env.NEXTAUTH_URL}/admin`;
        
        await Promise.allSettled(
          admins.map(admin => 
            lineClient.pushMessage({
              to: admin.lineId!,
              messages: [{ type: "text", text: messageText }]
            })
          )
        );
      }
    } catch (pushErr) {
      console.error("Failed to push message to admins:", pushErr);
    }

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
