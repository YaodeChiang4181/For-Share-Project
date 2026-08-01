export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const { itemId, pointsCost, itemName } = await req.json();

    if (!pointsCost || pointsCost < 1) {
      return NextResponse.json({ error: "無效的商品" }, { status: 400 });
    }

    const userId = session.user.id;

    // 取得當前使用者狀態
    const currentUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!currentUser) {
      return NextResponse.json({ error: "找不到使用者" }, { status: 404 });
    }

    if (currentUser.points < pointsCost) {
      return NextResponse.json({ error: "您的積分不足" }, { status: 403 });
    }

    // Phase 3: 行為經濟學 (損失厭惡) - 檢查免費用戶兌換高階商品的限制
    if (currentUser.role === "FREE") {
      // 假設 pointsCost >= 100 屬於高階商品（如超商商品卡）
      if (pointsCost >= 100) {
        return NextResponse.json({ 
          error: "高階商品為 Share 會員專屬獎勵，請先升級 VIP！",
          requiresUpgrade: true
        }, { status: 403 });
      }

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // 取得當前總體經濟匯率
      const rateSetting = await prisma.systemSetting.findUnique({ where: { key: "exchangeRate" } });
      const currentRate = rateSetting ? parseFloat(rateSetting.value) : 1.0;
      const dynamicLimit = 50 * currentRate;

      const monthlyRequests = await prisma.withdrawalRequest.aggregate({
        where: {
          userId,
          createdAt: { gte: startOfMonth }
        },
        _sum: { amount: true }
      });

      const currentRedeemed = monthlyRequests._sum.amount || 0;
      
      if (currentRedeemed + pointsCost > dynamicLimit) {
        return NextResponse.json({ 
          error: `一般會員每月兌換上限為 ${dynamicLimit} 點 (依通膨係數調整)。您本月額度不足。升級 Share 會員解鎖無上限兌換！`,
          requiresUpgrade: true
        }, { status: 403 });
      }
    }

    // 產生一組假的虛擬條碼序號
    const fakeBarcode = "FS" + Math.random().toString(36).substring(2, 10).toUpperCase() + Date.now().toString().slice(-4);

    // 執行交易
    await prisma.$transaction(async (tx) => {
      // 1. 扣除使用者點數
      await tx.user.update({
        where: { id: userId },
        data: { points: { decrement: pointsCost } }
      });

      // 2. 建立交易紀錄 (扣款)
      await tx.transactionRecord.create({
        data: {
          userId,
          type: "SPEND_REDEEM",
          amount: -pointsCost,
          description: `兌換商品：${itemName}`,
        }
      });

      // 3. 建立兌換紀錄 (方便後台結算)
      await tx.withdrawalRequest.create({
        data: {
          userId,
          amount: pointsCost,
          status: "APPROVED",
          notes: itemName
        }
      });

      // 4. 發送虛擬禮物卡到信箱
      await tx.inboxMessage.create({
        data: {
          userId,
          title: `禮物：${itemName}`,
          content: `恭喜您成功兌換「${itemName}」！憑下方條碼即可至指定超商刷讀使用。感謝您對 ForShare 平台知識共享的貢獻！`,
          barcode: fakeBarcode
        }
      });
    });

    return NextResponse.json({ message: "兌換成功！已發送至您的信箱。", barcode: fakeBarcode }, { status: 200 });

  } catch (error) {
    console.error("Redeem error:", error);
    return NextResponse.json({ error: "伺服器發生錯誤" }, { status: 500 });
  }
}
