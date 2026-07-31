export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const userId = session.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "找不到使用者" }, { status: 404 });
    }

    if (user.role === "SHARE_VIP") {
      return NextResponse.json({ error: "您已經是 Share 會員了！" }, { status: 400 });
    }

    // Phase 3: 行為經濟學 (沉沒成本)
    const UPGRADE_COST = 150;
    if (user.points < UPGRADE_COST) {
      return NextResponse.json({ 
        error: `升級 Share 會員需要 ${UPGRADE_COST} 點積分，您的積分不足！` 
      }, { status: 403 });
    }

    // 模擬綠界金流 / 積分升級會員
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { 
          role: "SHARE_VIP",
          points: { decrement: UPGRADE_COST }
        }
      });

      await tx.transactionRecord.create({
        data: {
          userId,
          type: "SPEND_VIP",
          amount: -UPGRADE_COST,
          description: "升級為 Share 會員"
        }
      });
    });

    // 發送信件通知
    await prisma.inboxMessage.create({
      data: {
        userId,
        title: "👑 恭喜升級為 Share 會員！",
        content: "感謝您的訂閱！您現在已解鎖無上限兌換點數額度，並且可以使用多關鍵字搜尋等進階功能。在知識共享的路上，ForShare 與您並肩前行！"
      }
    });

    return NextResponse.json({ message: "升級成功！" }, { status: 200 });
  } catch (error) {
    console.error("Upgrade error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
