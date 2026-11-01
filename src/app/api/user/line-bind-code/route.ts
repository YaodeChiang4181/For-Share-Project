export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// 取得當前 LINE 綁定狀態
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { lineId: true },
  });

  return NextResponse.json({
    isLinked: !!user?.lineId,
  });
}

// 產生 6 位數短效 LINE 綁定驗證碼
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const userId = session.user.id;
  const identifier = `line_bind:${userId}`;

  // 產生 6 位數隨機數字
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 分鐘效期

  try {
    // 移除舊代碼
    await prisma.verificationToken.deleteMany({
      where: { identifier },
    });

    // 建立新代碼
    await prisma.verificationToken.create({
      data: {
        identifier,
        token: code,
        expires,
      },
    });

    return NextResponse.json({
      success: true,
      code,
      expiresAt: expires.toISOString(),
      // 官方帳號加好友連結或預設提示
      lineAddFriendUrl: process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL || "https://line.me/R/nv/recommendOA",
    });
  } catch (err: any) {
    console.error("生成 LINE 綁定碼失敗:", err);
    return NextResponse.json({ error: "系統錯誤，無法生成驗證碼" }, { status: 500 });
  }
}
