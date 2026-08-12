import { NextRequest, NextResponse } from "next/server";
import { handleWebhookEvent } from "@/lib/line-bot";
import { WebhookEvent } from "@line/bot-sdk";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const signature = req.headers.get("x-line-signature") as string;
    const channelSecret = process.env.LINE_CHANNEL_SECRET || "";

    // 驗證簽章
    const hash = crypto
      .createHmac("SHA256", channelSecret)
      .update(text)
      .digest("base64");
      
    if (hash !== signature) {
      console.error("Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(text);
    const events: WebhookEvent[] = body.events;

    if (!events || events.length === 0) {
      return NextResponse.json({ message: "No events" }, { status: 200 });
    }

    // 平行處理所有事件
    await Promise.all(
      events.map(async (event) => {
        try {
          await handleWebhookEvent(event);
        } catch (err) {
          console.error("Error handling event:", err);
        }
      })
    );

    return NextResponse.json({ message: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
