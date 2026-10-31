export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSummary, generateTags } from "@/lib/ai";
import { extractTextFromPDF } from "@/lib/pdfExtract";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { sanitizeAiTags } from "@/lib/tagSanitizer";

const s3 = process.env.S3_ENDPOINT ? new S3Client({
  region: "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  }
}) : null;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "請先登入帳號" }, { status: 401 });
    }

    const body = await req.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json({ error: "缺少筆記 ID" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json({ error: "找不到該筆記" }, { status: 404 });
    }

    const isAuthor = post.authorId === session.user.id;
    const isAdmin = (session.user as any).role === "ADMIN";

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: "僅有作者或管理員可重新提煉摘要" }, { status: 403 });
    }

    // 1. 分離舊摘要與原本文
    let originalBody = post.content || "";
    if (originalBody.includes("---")) {
      const parts = originalBody.split("---");
      // 注意：AI 摘要本身可能帶有 --- 分隔線，真正的原作者文字位於最後一個 --- 之後
      originalBody = parts[parts.length - 1].trim();
    } else {
      originalBody = originalBody
        .replace(/^>.*?\n+/gm, "")
        .replace(/生成摘要時發生錯誤.*?(\n|$)/g, "")
        .trim();
    }

    let textToSummarize = originalBody;

    // 2. 若附有 PDF，嘗試從 PDF 重新萃取文字
    if (post.fileUrl) {
      try {
        if (post.fileUrl.startsWith("data:application/pdf;base64,")) {
          const base64Data = post.fileUrl.replace("data:application/pdf;base64,", "");
          const buffer = Buffer.from(base64Data, "base64");
          const pdfText = await extractTextFromPDF(buffer);
          if (pdfText && pdfText.trim().length > 30) {
            textToSummarize = pdfText.trim();
          }
        } else if (s3 && process.env.S3_ENDPOINT && post.fileUrl.startsWith(process.env.S3_ENDPOINT)) {
          // 從 Cloudflare R2 / S3 私有端點透過 SDK 安全讀取
          const bucketAndKey = post.fileUrl.replace(process.env.S3_ENDPOINT + "/", "");
          const bucketName = process.env.S3_BUCKET_NAME || "";
          let key = bucketAndKey;
          if (key.startsWith(bucketName + "/")) {
            key = key.replace(bucketName + "/", "");
          }

          console.log(`[Regenerate] 正在從 R2/S3 下載 PDF: Bucket="${bucketName}", Key="${key}"`);
          const s3Res = await s3.send(new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
          }));

          const byteArray = await s3Res.Body?.transformToByteArray();
          if (byteArray) {
            const buffer = Buffer.from(byteArray);
            const pdfText = await extractTextFromPDF(buffer);
            if (pdfText && pdfText.trim().length > 30) {
              textToSummarize = pdfText.trim();
              console.log(`[Regenerate] 成功從 PDF 萃取出 ${pdfText.length} 個字元！`);
            }
          }
        } else if (post.fileUrl.toLowerCase().includes(".pdf")) {
          // 一般公開 URL 的 fallback
          const res = await fetch(post.fileUrl);
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            const pdfText = await extractTextFromPDF(Buffer.from(arrayBuffer));
            if (pdfText && pdfText.trim().length > 30) {
              textToSummarize = pdfText.trim();
            }
          }
        }
      } catch (pdfErr) {
        console.warn("無法從 PDF 讀取內容，降級使用筆記文字:", pdfErr);
      }
    }

    if (!textToSummarize) {
      textToSummarize = post.title;
    }

    // 3. 呼叫多模型降級輪迴機制進行摘要與語意標籤生成
    console.log(`[Regenerate Summary] 開始為筆記 ${postId} 重新提煉摘要 (內文長度: ${textToSummarize.length})...`);
    const [newSummary, newTags] = await Promise.all([
      generateSummary(textToSummarize),
      generateTags(textToSummarize),
    ]);

    if (newSummary.includes("生成摘要時發生錯誤") || newSummary.includes("無法提供摘要")) {
      return NextResponse.json({
        error: "所有備用模型均無法回應，請稍後再試",
        details: newSummary,
      }, { status: 502 });
    }

    // 4. 重構最終內文並寫入資料庫
    const finalContent = originalBody && originalBody !== post.title
      ? `> [ 內容要點提煉 ]\n\n${newSummary}\n\n---\n\n${originalBody}`
      : `> [ 內容要點提煉 ]\n\n${newSummary}`;
    const safeTags = sanitizeAiTags(newTags);
    const updateData: any = { content: finalContent };
    if (safeTags.length > 0) {
      updateData.aiTags = JSON.stringify(safeTags);
    }

    await prisma.post.update({
      where: { id: postId },
      data: updateData,
    });

    console.log(`[Regenerate Summary] 筆記 ${postId} 摘要重新提煉並更新成功！`);

    return NextResponse.json({
      message: "AI 摘要已透過多模型輪迴機制成功提煉更新！",
      content: finalContent,
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error in regenerate-summary route:", error);
    return NextResponse.json({
      error: "重新提煉摘要時發生錯誤",
      details: error.message || String(error),
    }, { status: 500 });
  }
}
