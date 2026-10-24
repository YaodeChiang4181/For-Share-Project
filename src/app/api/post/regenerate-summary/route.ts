export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSummary } from "@/lib/ai";
import { extractTextFromPDF } from "@/lib/pdfExtract";

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
      originalBody = parts.slice(1).join("---").trim();
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
        } else if (post.fileUrl.toLowerCase().includes(".pdf")) {
          // 外部 URL (如 R2/S3)
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

    // 3. 呼叫多模型降級輪迴機制進行摘要生成
    console.log(`[Regenerate Summary] 開始為筆記 ${postId} 重新提煉摘要...`);
    const newSummary = await generateSummary(textToSummarize);

    if (newSummary.includes("生成摘要時發生錯誤") || newSummary.includes("無法提供摘要")) {
      return NextResponse.json({
        error: "所有備用模型均無法回應，請稍後再試",
        details: newSummary,
      }, { status: 502 });
    }

    // 4. 重構最終內文並寫入資料庫
    const finalContent = `> [ 內容要點提煉 ]\n\n${newSummary}\n\n---\n\n${originalBody || post.title}`;

    await prisma.post.update({
      where: { id: postId },
      data: { content: finalContent },
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
