import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import type { OAuthConfig } from "next-auth/providers/oauth";
import CredentialsProvider from "next-auth/providers/credentials";
import LineProvider from "next-auth/providers/line";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

export interface NCUProfile {
  id?: string | number;
  identifier?: string;
  "chinese-name"?: string;
  "english-name"?: string;
  "student-id"?: string;
  email?: string;
  "academy-records"?: Array<{
    name?: string;
    unit?: string;
    studyName?: string;
    studentStatus?: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export function NcuProvider(options?: { clientId?: string; clientSecret?: string }): OAuthConfig<NCUProfile> {
  const envClientId = process.env.NCU_CLIENT_ID?.trim();
  const envClientSecret = process.env.NCU_CLIENT_SECRET?.trim();
  const optClientId = options?.clientId?.trim();
  const optClientSecret = options?.clientSecret?.trim();

  const clientId = optClientId || envClientId || "20261031220404GEWxNKrY6hCl";
  const clientSecret = optClientSecret || envClientSecret || "zbYbxjLdq1ifm0PQsq8Q5JJuGy5k1mXm4xNmGF9SDFDvqvF";

  return {
    id: "ncu",
    name: "中央大學 Portal",
    type: "oauth",
    version: "2.0",
    authorization: {
      url: "https://portal.ncu.edu.tw/oauth2/authorization",
      params: {
        scope: process.env.NCU_SCOPES || "identifier chinese-name",
      },
    },
    checks: ["state"],
    token: {
      url: "https://portal.ncu.edu.tw/oauth2/token",
      async request({ params, provider }) {
        // NCU Portal 規定 Token 請求必須使用 HTTP Basic Authentication 與 Accept: application/json
        const basicAuth = Buffer.from(
          `${provider.clientId}:${provider.clientSecret}`
        ).toString("base64");

        const body = new URLSearchParams({
          grant_type: "authorization_code",
          code: params.code as string,
          redirect_uri: provider.callbackUrl,
        });

        console.log("[NCU Portal] 發起 Token 兌換:", {
          callbackUrl: provider.callbackUrl,
          hasCode: Boolean(params.code),
          clientId: provider.clientId,
        });

        const res = await fetch("https://portal.ncu.edu.tw/oauth2/token", {
          method: "POST",
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: body.toString(),
        });

        const rawText = await res.text();
        let data: any = {};
        try {
          data = JSON.parse(rawText);
        } catch {
          console.error("[NCU Token Error] 回傳非 JSON 內容:", { status: res.status, rawText });
          throw new Error(`NCU Token 端點回應異常 (HTTP ${res.status}): ${rawText.slice(0, 150)}`);
        }

        // 注意：NCU Portal 發生錯誤（如 Code 無效或回傳網址不符）時可能回傳 HTTP 200 配 {"error":"..."}
        if (!res.ok || data.error || !data.access_token) {
          console.error("[NCU Token Error] 兌換 Access Token 失敗:", {
            status: res.status,
            data,
            callbackUrl: provider.callbackUrl,
          });
          const errorMsg = data.error_description || data.error || "無法取得 NCU Access Token";
          throw new Error(errorMsg);
        }

        console.log("[NCU Portal] Access Token 取得成功！");
        return { tokens: data };
      },
    },
    userinfo: {
      url: "https://portal.ncu.edu.tw/apis/oauth/v1/info",
      async request({ tokens }) {
        if (!tokens.access_token) {
          console.error("[NCU UserInfo Error] 缺少 access_token");
          throw new Error("NCU UserInfo 要求失敗：缺少 access_token");
        }

        const res = await fetch("https://portal.ncu.edu.tw/apis/oauth/v1/info", {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            Accept: "application/json",
          },
        });

        const rawText = await res.text();
        if (!rawText || rawText.trim() === "") {
          console.error("[NCU UserInfo Error] Portal 回傳空內容 (HTTP " + res.status + ")");
          throw new Error(`NCU UserInfo 端點回傳空字串 (HTTP ${res.status})，請確認權限或 Token 有效性`);
        }

        let data: any = {};
        try {
          data = JSON.parse(rawText);
        } catch {
          console.error("[NCU UserInfo Error] 回傳非 JSON 內容:", { status: res.status, rawText });
          throw new Error(`NCU UserInfo 非有效 JSON: ${rawText.slice(0, 150)}`);
        }

        if (!res.ok || data.error) {
          console.error("[NCU UserInfo Error] 取得個人資料失敗:", { status: res.status, data });
          throw new Error(data.error_description || data.error || "NCU UserInfo 請求失敗");
        }

        console.log("[NCU Portal] 成功獲取中大使用者資料:", {
          identifier: data.identifier,
          name: data["chinese-name"] || data["english-name"],
        });

        return data;
      },
    },
    clientId,
    clientSecret,
    allowDangerousEmailAccountLinking: true,
    profile(profile: NCUProfile) {
      const studentId = profile["student-id"] || profile.identifier;
      const ncuId = String(profile.id || profile.identifier || studentId || "");
      const name = profile["chinese-name"] || profile["english-name"] || studentId || "中大學生";
      const email = profile.email || (studentId ? `${studentId}@cc.ncu.edu.tw` : `${ncuId}@ncu.edu.tw`);

      return {
        id: ncuId,
        name,
        email,
        image: null,
        role: "FREE",
        points: 0,
      };
    },
  };
}

const baseAdapter = PrismaAdapter(prisma);

const authAdapter: any = {
  ...baseAdapter,
  async linkAccount(account: any) {
    // 解決 Prisma 不接受 expires_in 與其他自訂屬性導致 Invalid prisma.account.create() 報錯問題
    const {
      userId,
      type,
      provider,
      providerAccountId,
      refresh_token,
      access_token,
      expires_at,
      expires_in,
      token_type,
      scope,
      id_token,
      session_state,
    } = account;

    const calculatedExpiresAt =
      typeof expires_at === "number"
        ? expires_at
        : typeof expires_in === "number"
        ? Math.floor(Date.now() / 1000) + expires_in
        : null;

    return prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      update: {
        refresh_token: refresh_token || null,
        access_token: access_token || null,
        expires_at: calculatedExpiresAt,
        token_type: token_type || null,
        scope: scope || null,
        id_token: id_token || null,
        session_state: session_state || null,
      },
      create: {
        userId,
        type,
        provider,
        providerAccountId,
        refresh_token: refresh_token || null,
        access_token: access_token || null,
        expires_at: calculatedExpiresAt,
        token_type: token_type || null,
        scope: scope || null,
        id_token: id_token || null,
        session_state: session_state || null,
      },
    });
  },
};

export const authOptions: NextAuthOptions = {
  adapter: authAdapter,
  providers: [
    NcuProvider(),
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID || "",
      clientSecret: process.env.LINE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("請輸入 Email 與密碼");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("您未具有使用身分，麻煩您先註冊喔");
        }

        if (!user.password) {
          throw new Error("此帳號未設定密碼，請使用正確的登入方式");
        }

        if (user.bannedUntil && user.bannedUntil > new Date()) {
          const unlockDate = user.bannedUntil.toLocaleDateString("zh-TW", {
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit"
          });
          throw new Error(`您已被系統停權至 ${unlockDate}，期間無法登入。`);
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("帳號或密碼錯誤");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          points: user.points,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "line") {
        // 更新 user 中的 lineId
        if (user?.id) {
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { lineId: account.providerAccountId },
            });
          } catch (err) {
            console.error("LINE ID 綁定失敗", err);
          }
        }
      } else if (account?.provider === "ncu") {
        if (user?.id) {
          try {
            // 注意：新用戶首次登入時，user.id 可能是 NCUProfile 傳來的 id (例如學號)，需尋找資料庫中真實的使用者 ID
            const dbUser = await prisma.user.findFirst({
              where: {
                OR: [
                  { id: user.id },
                  ...(user.email ? [{ email: user.email }] : [])
                ]
              }
            });

            if (dbUser) {
              const p = (profile || {}) as NCUProfile;
              const studentId = p["student-id"] || p.identifier;
              const realName = p["chinese-name"] || dbUser.name || user.name;
              let department = "";

              const academy = p["academy-records"];
              if (Array.isArray(academy) && academy.length > 0) {
                department = academy[0].name || academy[0].unit || academy[0].studyName || "";
              } else if (academy && typeof academy === "object") {
                department = (academy as any).name || (academy as any).unit || "";
              }

              // 同步或創建 UserProfile，自動記錄中央大學學籍與科系
              await prisma.userProfile.upsert({
                where: { userId: dbUser.id },
                update: {
                  university: "國立中央大學",
                  ...(realName ? { realName } : {}),
                  ...(studentId ? { studentId } : {}),
                  ...(department ? { department } : {}),
                },
                create: {
                  userId: dbUser.id,
                  university: "國立中央大學",
                  realName: realName || null,
                  studentId: studentId || null,
                  department: department || null,
                },
              });
              console.log(`[NCU Portal SSO] 使用者 ${dbUser.id} (${realName}, ${studentId}, ${department}) 登入成功並更新學籍！`);
            }
          } catch (profileErr) {
            console.error("更新 NCU UserProfile 失敗", profileErr);
          }
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "FREE";
        token.points = (user as any).points || 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
        (session.user as { points: number }).points = token.points as number;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      console.log(`[NextAuth Event] 成功創建新使用者: ${user.id} (${user.email})`);
    },
    async linkAccount({ user, account }) {
      console.log(`[NextAuth Event] 成功綁定第三方帳號: 使用者 ${user.id} -> 供應商 ${account.provider}`);
    },
  },
  pages: {
    signIn: "/login",
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
};
