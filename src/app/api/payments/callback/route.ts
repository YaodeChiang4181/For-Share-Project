export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { verifyCheckMacValue } from "@/lib/providers/ecpay";

// 綠界回呼是使用 application/x-www-form-urlencoded
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // 1. 驗證 CheckMacValue 確保這是來自綠界的真實請求
    if (!verifyCheckMacValue(params)) {
      console.error("[ECPay Callback] 檢查碼驗證失敗", params);
      return new Response("0|Error", { status: 400 }); // 回傳失敗，綠界會重試
    }

    const { MerchantTradeNo, RtnCode, TradeNo, PaymentDate, PaymentType } = params;

    // 2. 尋找對應訂單
    const order = await prisma.paymentOrder.findUnique({
      where: { merchantTradeNo: MerchantTradeNo }
    });

    if (!order) {
      console.error("[ECPay Callback] 找不到訂單", MerchantTradeNo);
      return new Response("0|OrderNotFound", { status: 400 });
    }

    if (order.status === "PAID") {
      // 已經處理過了，直接回傳成功以符合綠界規範
      return new Response("1|OK", { status: 200 });
    }

    // 3. 判斷付款結果
    if (RtnCode === "1") {
      // 必須先確認付款成功，再進行核心資料庫交易
      await prisma.$transaction(async (tx) => {
        // 更新訂單狀態
        await tx.paymentOrder.update({
          where: { id: order.id },
          data: {
            status: "PAID",
            tradeNo: TradeNo,
            paymentType: PaymentType,
            paymentDate: PaymentDate ? new Date(PaymentDate) : new Date()
          }
        });

        // 依據類型發放對應獎勵
        if (order.itemType === "VIP_UPGRADE") {
          await tx.user.update({
            where: { id: order.userId },
            data: { role: "SHARE_VIP" }
          });
          
          await tx.inboxMessage.create({
            data: {
              userId: order.userId,
              title: "👑 恭喜升級為 Share 會員！",
              content: "感謝您的訂閱！您現在已解鎖無上限兌換點數額度，並且可以使用多關鍵字搜尋等進階功能。在知識共享的路上，ForShare 與您並肩前行！"
            }
          });
        } else if (order.itemType === "POINTS_TOPUP") {
          await tx.user.update({
            where: { id: order.userId },
            data: { points: { increment: order.pointsToAdd } }
          });

          await tx.transactionRecord.create({
            data: {
              userId: order.userId,
              type: "EARN_TOPUP",
              amount: order.pointsToAdd,
              description: `儲值 ${order.pointsToAdd} 點積分`
            }
          });

          await tx.inboxMessage.create({
            data: {
              userId: order.userId,
              title: "💰 積分儲值成功！",
              content: `您已成功儲值 ${order.pointsToAdd} 點積分！感謝您的支持，祝您兌換愉快。`
            }
          });
        }
      });
      
      console.log("[ECPay Callback] 訂單處理成功:", MerchantTradeNo);
      // 確認收款成功才回傳 1|OK
      return new Response("1|OK", { status: 200 });
    } else {
      // 付款失敗 (可能卡片不過等)
      await prisma.paymentOrder.update({
        where: { id: order.id },
        data: { status: "FAILED" }
      });
      return new Response("1|OK", { status: 200 }); // 回傳 OK 讓綠界知道我們收到失敗通知了
    }

  } catch (error) {
    console.error("[ECPay Callback] 伺服器錯誤:", error);
    return new Response("0|Error", { status: 500 });
  }
}
