export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { generateECPayHtml } from "@/lib/providers/ecpay";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const { type, amount } = await req.json(); // type: "VIP_UPGRADE" | "POINTS_TOPUP"
    const userId = session.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "找不到使用者" }, { status: 404 });
    }

    let itemName = "";
    let pointsToAdd = 0;
    let actualAmount = 0;

    if (type === "VIP_UPGRADE") {
      if (user.role === "SHARE_VIP") {
        return NextResponse.json({ error: "您已經是 Share 會員了！" }, { status: 400 });
      }
      itemName = "Share VIP 終身會員";
      actualAmount = 150;
    } else if (type === "POINTS_TOPUP") {
      if (!amount || amount < 50) {
        return NextResponse.json({ error: "最低儲值金額為 NT$50" }, { status: 400 });
      }

      let bonus = 0;
      if (amount === 150) bonus = 10;
      else if (amount === 300) bonus = 30;
      else if (amount === 500) bonus = 100;

      itemName = `購買 ${amount} 點積分 (贈送 ${bonus} 點)`;
      actualAmount = amount;
      pointsToAdd = amount + bonus;
    } else {
      return NextResponse.json({ error: "無效的訂單類型" }, { status: 400 });
    }

    // 產生專屬訂單編號 (綠界要求長度小於20字元且唯一)
    const merchantTradeNo = `FS${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 建立 PENDING 訂單
    await prisma.paymentOrder.create({
      data: {
        merchantTradeNo,
        userId,
        amount: actualAmount,
        itemName,
        itemType: type,
        pointsToAdd
      }
    });

    // 呼叫模組產生轉跳表單
    const htmlForm = generateECPayHtml({
      merchantTradeNo,
      amount: actualAmount,
      itemName
    });

    return NextResponse.json({ html: htmlForm }, { status: 200 });

  } catch (error) {
    console.error("Payment Create error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
