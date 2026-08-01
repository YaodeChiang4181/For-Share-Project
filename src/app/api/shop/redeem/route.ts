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

    // 生成 Idempotency Key (防重複發放)
    const idempotencyKey = `REDEEM-${userId}-${itemId}-${Date.now()}`;
    let withdrawalRequestId = "";

    // === 第一階段 (Phase 1): 預扣點數並建立 PENDING 紀錄 ===
    // 這樣做是為了防止使用者並發點擊，洗出多張票券
    await prisma.$transaction(async (tx) => {
      // 1. 扣除使用者點數
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { points: { decrement: pointsCost } }
      });
      if (updatedUser.points < 0) {
        throw new Error("INSUFFICIENT_FUNDS"); // 交易會自動 rollback
      }

      // 2. 建立交易紀錄 (扣款)
      await tx.transactionRecord.create({
        data: {
          userId,
          type: "SPEND_REDEEM",
          amount: -pointsCost,
          description: `申請兌換商品：${itemName}`,
        }
      });

      // 3. 建立兌換紀錄 (設定為 PENDING)
      const withdrawal = await tx.withdrawalRequest.create({
        data: {
          userId,
          amount: pointsCost,
          status: "PENDING",
          notes: itemName
        }
      });
      withdrawalRequestId = withdrawal.id;
    });

    // === 第二階段 (Phase 2): 呼叫外部 B2B 票券商 API ===
    // 若在此階段伺服器斷線，會有 PENDING 的單子和被扣除的點數，
    // 可透過後台 Cron Job 或客服系統人工退還/補發。
    const { issueRealVoucher } = await import("@/lib/providers/voucher");
    const voucherRes = await issueRealVoucher(itemId, idempotencyKey);

    // === 第三階段 (Phase 3): 處理 API 回應 ===
    if (voucherRes.success && voucherRes.voucherUrl) {
      // API 發行成功，寫入真實票券資訊並核發
      await prisma.$transaction(async (tx) => {
        // 更新狀態為 APPROVED
        await tx.withdrawalRequest.update({
          where: { id: withdrawalRequestId },
          data: {
            status: "APPROVED",
            providerTxId: voucherRes.transactionId,
            voucherUrl: voucherRes.voucherUrl
          }
        });

        // 發送真實禮物卡到信箱
        await tx.inboxMessage.create({
          data: {
            userId,
            title: `禮物：${itemName}`,
            content: `恭喜您成功兌換「${itemName}」！請點擊下方按鈕開啟專屬票券網頁，並至門市刷條碼使用。`,
            barcode: voucherRes.barcode,
            actionUrl: voucherRes.voucherUrl
          }
        });
      });

      return NextResponse.json({ message: "兌換成功！真實票券已發送至您的信箱。", barcode: voucherRes.barcode }, { status: 200 });
      
    } else {
      // API 發行失敗 (例如廠商餘額不足)，執行退款機制 (Rollback)
      console.error("[Redeem Error] 第三方 API 發行失敗:", voucherRes.error);

      await prisma.$transaction(async (tx) => {
        // 退還點數
        await tx.user.update({
          where: { id: userId },
          data: { points: { increment: pointsCost } }
        });

        // 紀錄退款
        await tx.transactionRecord.create({
          data: {
            userId,
            type: "REFUND_REDEEM",
            amount: pointsCost,
            description: `兌換失敗退款：${itemName}`,
          }
        });

        // 更新狀態為 REJECTED
        await tx.withdrawalRequest.update({
          where: { id: withdrawalRequestId },
          data: {
            status: "REJECTED",
            notes: `發券失敗自動退回：${voucherRes.error}`
          }
        });
        
        // 也可以發一封信通知用戶失敗並退款
      });

      return NextResponse.json({ error: "發行票券失敗，點數已安全退還至您的帳戶，請稍後再試。" }, { status: 500 });
    }

  } catch (error) {
    console.error("Redeem error:", error);
    return NextResponse.json({ error: "伺服器發生錯誤" }, { status: 500 });
  }
}
