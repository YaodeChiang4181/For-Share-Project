import { messagingApi, WebhookEvent } from "@line/bot-sdk";
import { prisma } from "@/lib/prisma";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};

export const lineClient = new messagingApi.MessagingApiClient(config);
export const blobClient = new messagingApi.MessagingApiBlobClient(config);

const s3 = process.env.S3_ENDPOINT ? new S3Client({
  region: "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  }
}) : null;

// -----------------------------------------------------------------------------
// Flex Message Generators
// -----------------------------------------------------------------------------

export function createAccountInfoFlexMessage(user: any): any {
  return {
    type: "flex",
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

export function createSearchCarousel(posts: any[]): any {
  const bubbles: any[] = posts.map((post) => ({
    type: "bubble",
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
            uri: `${process.env.NEXTAUTH_URL}/explore/${post.id}`,
          },
        },
      ],
    },
  }));

  // Add the "Explore more" card
  bubbles.push({
    type: "bubble",
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
    type: "flex",
    altText: "搜尋結果",
    contents: {
      type: "carousel",
      contents: bubbles,
    },
  };
}

export async function handleWebhookEvent(event: WebhookEvent) {
  if (event.type !== "message") {
    return null;
  }

  const replyToken = event.replyToken;
  const lineUserId = event.source.userId;
  if (!lineUserId) return null;

  // 1. 先確認是否在「對話上傳」階段
  const session = await prisma.lineUploadSession.findUnique({
    where: { lineId: lineUserId },
  });

  const isText = event.message.type === "text";
  const text = isText ? (event.message as any).text : "";

  // 處理取消上傳
  if (isText && (text === "取消" || text === "取消上傳" || text === "退出")) {
    if (session) {
      await prisma.lineUploadSession.delete({ where: { id: session.id } });
      await lineClient.replyMessage({
        replyToken,
        messages: [{ type: "text", text: "已為您取消上傳筆記。" }],
      });
      return;
    }
  }

  // 若使用者觸發上傳筆記
  if (isText && text === "上傳筆記") {
    const user = await prisma.user.findUnique({ where: { lineId: lineUserId } });
    if (!user) {
      await lineClient.replyMessage({
        replyToken,
        messages: [{ type: "text", text: "您尚未綁定 For Share 帳號，請先前往網站登入綁定後，才能上傳筆記！" }]
      });
      return;
    }

    await prisma.lineUploadSession.upsert({
      where: { lineId: lineUserId },
      update: { step: "WAITING_TITLE", title: null, category: null, content: null },
      create: { lineId: lineUserId, step: "WAITING_TITLE" }
    });

    await lineClient.replyMessage({
      replyToken,
      messages: [{ type: "text", text: "📝 開始上傳筆記！\n\n請問這份筆記的「標題」是什麼？\n(隨時可輸入「取消」來中斷)" }]
    });
    return;
  }

  // 若使用者觸發查詢筆記
  if (isText && text === "查詢") {
    await prisma.lineUploadSession.upsert({
      where: { lineId: lineUserId },
      update: { step: "WAITING_SEARCH_KEYWORD", title: null, category: null, content: null },
      create: { lineId: lineUserId, step: "WAITING_SEARCH_KEYWORD" }
    });

    await lineClient.replyMessage({
      replyToken,
      messages: [{ type: "text", text: "🔍 請輸入您想查詢的「關鍵字」：\n(隨時可輸入「取消」來退出查詢)" }]
    });
    return;
  }

  // 處理狀態機邏輯
  if (session) {
    if (isText) {
      if (session.step === "WAITING_SEARCH_KEYWORD") {
        const keyword = text.trim();
        
        // 清除 session
        await prisma.lineUploadSession.delete({ where: { id: session.id } });
        
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
            messages: [{ type: "text", text: `找不到關於「${keyword}」的筆記，請試試其他關鍵字，或前往網站查詢！` }],
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

      if (session.step === "WAITING_TITLE") {
        await prisma.lineUploadSession.update({
          where: { id: session.id },
          data: { title: text, step: "WAITING_CATEGORY" }
        });
        await lineClient.replyMessage({
          replyToken,
          messages: [{ type: "text", text: `標題「${text}」已記錄！\n\n請輸入這份筆記的「分類」(例如: 數學、微積分)：` }]
        });
        return;
      }

      if (session.step === "WAITING_CATEGORY") {
        await prisma.lineUploadSession.update({
          where: { id: session.id },
          data: { category: text, step: "WAITING_CONTENT" }
        });
        await lineClient.replyMessage({
          replyToken,
          messages: [{ type: "text", text: `分類「${text}」已記錄！\n\n請簡單輸入這份筆記的「內容描述」：` }]
        });
        return;
      }

      if (session.step === "WAITING_CONTENT") {
        await prisma.lineUploadSession.update({
          where: { id: session.id },
          data: { content: text, step: "WAITING_FILE" }
        });
        await lineClient.replyMessage({
          replyToken,
          messages: [{ type: "text", text: "描述已記錄！\n\n🎉 最後一步：請直接將「圖片」或「檔案 (PDF)」傳送至本聊天室！" }]
        });
        return;
      }

      if (session.step === "WAITING_FILE") {
        await lineClient.replyMessage({
          replyToken,
          messages: [{ type: "text", text: "請傳送有效的圖片或檔案，或者輸入「取消」放棄上傳。" }]
        });
        return;
      }
    } else if (event.message.type === "image" || event.message.type === "file") {
      if (session.step === "WAITING_FILE") {
        await lineClient.replyMessage({
          replyToken,
          messages: [{ type: "text", text: "⏳ 正在幫您上傳處理中，請稍候..." }]
        });

        try {
          const messageId = event.message.id;
          const streamResponse = await blobClient.getMessageContent(messageId);
          
          let fileBuffer: Buffer;
          if ((streamResponse as any).arrayBuffer) {
             fileBuffer = Buffer.from(await (streamResponse as any).arrayBuffer());
          } else {
             const chunks: any[] = [];
             for await (const chunk of streamResponse as any) {
               chunks.push(chunk);
             }
             fileBuffer = Buffer.concat(chunks);
          }

          let originalExt = ".jpg";
          let mimeType = "image/jpeg";
          if (event.message.type === "file") {
            const fileName = (event.message as any).fileName || "";
            const path = require("path");
            originalExt = path.extname(fileName) || ".pdf";
            mimeType = "application/octet-stream";
          }
          
          const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
          const filename = `line-upload-${uniqueSuffix}${originalExt}`;
          let fileUrl = "";

          if (s3 && process.env.S3_BUCKET_NAME) {
            await s3.send(new PutObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: filename,
              Body: fileBuffer,
              ContentType: mimeType,
            }));
            fileUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/${filename}`;
          } else {
            const base64Data = fileBuffer.toString("base64");
            fileUrl = `data:${mimeType};base64,${base64Data}`;
          }

          const user = await prisma.user.findUnique({ where: { lineId: lineUserId } });
          if (!user) throw new Error("User not found");

          const post = await prisma.$transaction(async (tx) => {
             const p = await tx.post.create({
               data: {
                 title: session.title || "LINE上傳筆記",
                 content: session.content || "",
                 category: session.category || "未分類",
                 fileUrl,
                 isPaid: true,
                 authorId: user.id
               }
             });
             return p;
          });

          const admins = await prisma.user.findMany({
            where: { role: "ADMIN", lineId: { not: null } }
          });
          if (admins.length > 0) {
            const messageText = `📢 [新筆記上傳通知]\n\n使用者 ${user.name || "某位使用者"} 剛剛透過 LINE 上傳了一份新筆記：\n「${session.title}」\n\n請前往後台查看審核：\n${process.env.NEXTAUTH_URL}/admin`;
            await Promise.allSettled(
              admins.map(admin => 
                lineClient.pushMessage({
                  to: admin.lineId!,
                  messages: [{ type: "text", text: messageText }]
                })
              )
            );
          }

          await prisma.lineUploadSession.delete({ where: { id: session.id } });

          await lineClient.pushMessage({
            to: lineUserId,
            messages: [{ type: "text", text: "🎉 上傳成功！您的筆記已經發布至平台上囉！" }]
          });
          
        } catch (err) {
          console.error("LINE Upload Error:", err);
          await lineClient.pushMessage({
            to: lineUserId,
            messages: [{ type: "text", text: "❌ 上傳發生錯誤，可能是檔案過大或網路不穩，請稍後再試。" }]
          });
        }
        return;
      }
    }
  }

  // 如果這不是 text，而且也沒有在對話階段中，就不處理
  if (!isText) return null;

  // 以下為原本的文字指令處理
  // 隱藏指令：綁定管理員身分
  if (text === "我是管理員 123456") {
    let user = await prisma.user.findUnique({
      where: { lineId: lineUserId },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "ADMIN" },
      });
    } else {
      user = await prisma.user.create({
        data: {
          lineId: lineUserId,
          role: "ADMIN",
          name: "LINE 管理員",
        },
      });
    }

    await lineClient.replyMessage({
      replyToken,
      messages: [{
        type: "text",
        text: "✅ 身分驗證成功！\n您已經被設定為「管理員」。未來只要有人上傳筆記，您都會在此收到通知。",
      }],
    });
    return;
  }

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

  // 預設回覆
  await lineClient.replyMessage({
    replyToken,
    messages: [{
      type: "text",
      text: "歡迎來到 For Share！\n👉 輸入「查詢資訊」查看點數\n👉 輸入「查詢」尋找筆記\n👉 輸入「上傳筆記」開始上傳",
    }],
  });
}
