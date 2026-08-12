import { Client, messagingApi, middleware, WebhookEvent, MessageAPIResponseBase } from "@line/bot-sdk";
import { prisma } from "@/lib/prisma";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};

export const lineClient = new messagingApi.MessagingApiClient(config);
export const lineMiddleware = middleware(config);

// -----------------------------------------------------------------------------
// Flex Message Generators
// -----------------------------------------------------------------------------

export function createAccountInfoFlexMessage(user: any) {
  return {
    type: "flex" as const,
    altText: "您的帳號資訊",
    contents: {
      type: "bubble" as const,
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "For Share 帳號資訊",
            weight: "bold",
            color: "#ffffff",
          },
        ],
        backgroundColor: "#27272a",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "身分", color: "#a1a1aa", size: "sm", flex: 1 },
              { type: "text", text: user.role === "SHARE_VIP" ? "VIP 會員" : "一般會員", color: "#ffffff", size: "sm", flex: 2, weight: "bold" },
            ],
            margin: "md",
          },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "目前積分", color: "#a1a1aa", size: "sm", flex: 1 },
              { type: "text", text: `${user.points} 點`, color: "#fbbf24", size: "sm", flex: 2, weight: "bold" },
            ],
            margin: "md",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#3b82f6",
            action: {
              type: "uri",
              label: "前往兌換點數",
              uri: `${process.env.NEXTAUTH_URL}/shop`,
            },
          },
        ],
      },
    },
  };
}

export function createSearchCarousel(posts: any[]) {
  const bubbles = posts.map((post) => ({
    type: "bubble" as const,
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: post.title,
          weight: "bold",
          size: "lg",
          wrap: true,
        },
        {
          type: "text",
          text: post.category,
          size: "sm",
          color: "#999999",
          margin: "sm",
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          action: {
            type: "uri",
            label: "查看筆記",
            uri: `${process.env.NEXTAUTH_URL}/posts/${post.id}`,
          },
        },
      ],
    },
  }));

  // Add the "Explore more" card
  bubbles.push({
    type: "bubble" as const,
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "探索更多內容",
          weight: "bold",
          size: "xl",
          align: "center",
          gravity: "center",
        },
      ],
      justifyContent: "center",
      alignItems: "center",
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#10b981",
          action: {
            type: "uri",
            label: "前往網站全面搜尋",
            uri: `${process.env.NEXTAUTH_URL}/explore`,
          },
        },
      ],
    },
  });

  return {
    type: "flex" as const,
    altText: "搜尋結果",
    contents: {
      type: "carousel" as const,
      contents: bubbles,
    },
  };
}

export async function handleWebhookEvent(event: WebhookEvent) {
  if (event.type !== "message" || event.message.type !== "text") {
    return null;
  }

  const { text } = event.message;
  const replyToken = event.replyToken;
  const lineUserId = event.source.userId;

  if (!lineUserId) return null;

  // 指令：帳號資訊查詢
  if (text === "查詢資訊" || text === "我的帳號") {
    const user = await prisma.user.findUnique({
      where: { lineId: lineUserId },
    });

    if (!user) {
      await lineClient.replyMessage({
        replyToken,
        messages: [{
          type: "text",
          text: "您尚未綁定 For Share 帳號。請前往網站登入後進行綁定。",
        }],
      });
      return;
    }

    const flexMsg = createAccountInfoFlexMessage(user);
    await lineClient.replyMessage({
      replyToken,
      messages: [flexMsg],
    });
    return;
  }

  // 指令：內部探索 (模擬搜尋)
  if (text.startsWith("搜尋 ") || text.startsWith("找 ")) {
    const keyword = text.replace(/^(搜尋|找)\s*/, "").trim();
    if (!keyword) {
      await lineClient.replyMessage({
        replyToken,
        messages: [{ type: "text", text: "請輸入要搜尋的關鍵字。例如：搜尋 微積分" }],
      });
      return;
    }

    // 查詢最近符合的貼文 (取前 5 筆)
    const posts = await prisma.post.findMany({
      where: {
        title: { contains: keyword, mode: "insensitive" },
        status: "ACTIVE",
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    if (posts.length === 0) {
      await lineClient.replyMessage({
        replyToken,
        messages: [{ type: "text", text: `找不到關於「${keyword}」的筆記，請試試其他關鍵字，或前往網站搜尋！` }],
      });
      return;
    }

    const carousel = createSearchCarousel(posts);
    await lineClient.replyMessage({
      replyToken,
      messages: [carousel],
    });
    return;
  }

  // 指令：上傳筆記引導
  if (text === "上傳筆記") {
    await lineClient.replyMessage({
      replyToken,
      messages: [{
        type: "text",
        text: "點擊下方連結前往網站上傳您的筆記，賺取積分！\n\n" + `${process.env.NEXTAUTH_URL}/upload`
      }],
    });
    return;
  }

  // 預設回覆
  await lineClient.replyMessage({
    replyToken,
    messages: [{
      type: "text",
      text: "歡迎來到 For Share！\n👉 輸入「查詢資訊」查看點數\n👉 輸入「搜尋 [關鍵字]」尋找筆記\n👉 輸入「上傳筆記」取得上傳連結",
    }],
  });
}
