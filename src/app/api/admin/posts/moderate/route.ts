import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json({ error: "權限不足，僅限管理員操作" }, { status: 403 });
    }

    const { postId, action } = await req.json();

    // action: "hide" | "ban" | "restore"
    const allowedActions = ["hide", "ban", "restore"];
    if (!postId || !action || !allowedActions.includes(action)) {
      return NextResponse.json({ error: "無效的操作參數" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json({ error: "找不到此筆記" }, { status: 404 });
    }

    if (action === "restore") {
      await prisma.post.update({
        where: { id: postId },
        data: { status: "ACTIVE" },
      });
      return NextResponse.json({ message: "已恢復該筆記狀態為上架中。" }, { status: 200 });
    }

    if (action === "hide") {
      await prisma.$transaction([
        prisma.post.update({
          where: { id: postId },
          data: { status: "HIDDEN" },
        }),
        // 同時將關聯的所有未處理檢舉單標記為已解決
        prisma.report.updateMany({
          where: {
            postId: postId,
            status: "PENDING",
          },
          data: { status: "RESOLVED" },
        }),
      ]);

      return NextResponse.json({ message: "筆記已成功下架。" }, { status: 200 });
    }

    if (action === "ban") {
      const banUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await prisma.$transaction([
        prisma.post.update({
          where: { id: postId },
          data: { status: "HIDDEN" },
        }),
        prisma.user.update({
          where: { id: post.authorId },
          data: { bannedUntil: banUntil },
        }),
        prisma.report.updateMany({
          where: {
            postId: postId,
            status: "PENDING",
          },
          data: { status: "RESOLVED" },
        }),
        prisma.inboxMessage.create({
          data: {
            userId: post.authorId,
            title: "⚠️ 帳號停權通知",
            content: `您的筆記「${post.title}」因嚴重違反社群規範已被管理員強制下架，且您的帳號已被停權至 ${banUntil.toLocaleDateString("zh-TW")}。如有疑問請聯繫管理團隊。`,
          },
        }),
      ]);

      return NextResponse.json({
        message: `筆記已下架，且作者已被停權至 ${banUntil.toLocaleDateString("zh-TW")}。`,
      }, { status: 200 });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (error) {
    console.error("Admin moderate post error:", error);
    return NextResponse.json({ error: "伺服器發生錯誤" }, { status: 500 });
  }
}
