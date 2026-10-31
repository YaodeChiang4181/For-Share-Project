import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 管理員專屬：標籤污染隔離與一鍵回滾 API
 * 功能：針對被提示注入、惡意投毒或 AI 誤判的筆記，一鍵安全隔離或重置標籤
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    // 驗證管理員權限
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json({ error: "權限不足，僅限管理員執行回滾操作" }, { status: 403 });
    }

    const { postId, mode } = await req.json();

    if (!postId) {
      return NextResponse.json({ error: "缺少必要參數 postId" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
        department: true,
        academicYear: true,
        noteType: true,
        aiTags: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "找不到該筆記" }, { status: 404 });
    }

    // mode: "FULL_RESET" (清空全部結構標籤與隱藏標籤) 或 "CLEAR_AI_TAGS_ONLY" (僅清空 AI 語意搜尋標籤)
    const resetData =
      mode === "CLEAR_AI_TAGS_ONLY"
        ? { aiTags: null }
        : {
            department: null,
            academicYear: null,
            noteType: null,
            aiTags: null,
          };

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: resetData,
    });

    console.log(`[資安審計] 管理員 ${session.user.email || session.user.id} 執行了標籤隔離回滾，目標筆記 [${postId}] "${post.title}"，模式: ${mode || "FULL_RESET"}`);

    return NextResponse.json({
      message: "標籤已成功安全隔離與重置",
      postId: updatedPost.id,
      previousTags: {
        department: post.department,
        academicYear: post.academicYear,
        noteType: post.noteType,
        aiTags: post.aiTags,
      },
      currentTags: {
        department: updatedPost.department,
        academicYear: updatedPost.academicYear,
        noteType: updatedPost.noteType,
        aiTags: updatedPost.aiTags,
      },
    });
  } catch (error) {
    console.error("Admin tag rollback error:", error);
    return NextResponse.json({ error: "伺服器異常，回滾操作失敗" }, { status: 500 });
  }
}
