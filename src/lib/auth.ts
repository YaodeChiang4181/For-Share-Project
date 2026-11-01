import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import type { OAuthConfig } from "next-auth/providers/oauth";
import CredentialsProvider from "next-auth/providers/credentials";
import LineProvider from "next-auth/providers/line";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { setAuthErrorDetail } from "@/lib/auth-error-store";

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
  const sanitize = (s?: string) => s?.trim().replace(/^["']|["']$/g, "");
  const envClientId = sanitize(process.env.NCU_CLIENT_ID);
  const envClientSecret = sanitize(process.env.NCU_CLIENT_SECRET);
  const optClientId = sanitize(options?.clientId);
  const optClientSecret = sanitize(options?.clientSecret);

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
        scope: process.env.NCU_SCOPES || "identifier chinese-name email",
      },
    },
    checks: ["none"],
    token: {
      url: "https://portal.ncu.edu.tw/oauth2/token",
      async request({ params, provider }) {
        // 檢查 Portal 回傳時是否帶有錯誤參數（例如使用者在 Portal 拒絕授權或 Portal 發生異常）
        if (params.error) {
          const errMsg = `Portal 授權被拒絕或失敗 (${params.error}: ${params.error_description || "使用者未確認授權或授權過期"})`;
          console.error("[NCU Callback Error]", params);
          setAuthErrorDetail(errMsg);
          throw new Error(errMsg);
        }

        if (!params.code) {
          const errMsg = `Portal 回傳缺少授權碼 (code 為空)。回傳內容: ${JSON.stringify(params)}`;
          console.error("[NCU Callback Error]", errMsg);
          setAuthErrorDetail(errMsg);
          throw new Error(errMsg);
        }

        const validClientId = (provider.clientId as string)?.trim() || clientId;
        const validClientSecret = (provider.clientSecret as string)?.trim() || clientSecret;

        // NCU Portal 規定 Token 請求必須使用 HTTP Basic Authentication 與 Accept: application/json
        const basicAuth = Buffer.from(
          `${validClientId}:${validClientSecret}`
        ).toString("base64");

        // 確保在 Vercel 生產環境下，回傳網址 100% 鎖定為與 Portal 後台完全相符的正式網址（強制 HTTPS）
        const targetCallbackUrl =
          (provider.callbackUrl && !provider.callbackUrl.includes("localhost") && provider.callbackUrl.startsWith("https://"))
            ? provider.callbackUrl
            : "https://for-shareproject1.vercel.app/api/auth/callback/ncu";

        // 依據 NCU Portal 官方規範：Body 僅帶 grant_type, code, redirect_uri，嚴禁重複帶入 client_id/client_secret
        const body = new URLSearchParams({
          grant_type: "authorization_code",
          code: params.code as string,
          redirect_uri: targetCallbackUrl,
        });

        console.log("[NCU Portal] 發起 Token 兌換:", {
          callbackUrl: targetCallbackUrl,
          hasCode: Boolean(params.code),
          clientId: validClientId,
          secretLength: validClientSecret.length,
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
          const errMsg = `NCU Token 端點回應異常 (HTTP ${res.status}): ${rawText.slice(0, 150)}`;
          console.error("[NCU Token Error] 回傳非 JSON 內容:", { status: res.status, rawText });
          setAuthErrorDetail(errMsg);
          throw new Error(errMsg);
        }

        // 注意：NCU Portal 發生錯誤（如 Code 無效或回傳網址不符）時可能回傳 HTTP 200 配 {"error":"..."}
        if (!res.ok || data.error || !data.access_token) {
          const errorMsg = data.error_description || data.error || `HTTP ${res.status}: 無法取得 NCU Access Token`;
          console.error("[NCU Token Error] 兌換 Access Token 失敗:", {
            status: res.status,
            data,
            callbackUrl: targetCallbackUrl,
            secretLength: validClientSecret.length,
          });
          const detailedErrMsg = `Portal Token 拒絕 (${errorMsg})。當前 Secret 長度: ${validClientSecret.length} 碼`;
          setAuthErrorDetail(detailedErrMsg);
          throw new Error(detailedErrMsg);
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
          setAuthErrorDetail("NCU UserInfo 要求失敗：缺少 access_token");
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
          const errMsg = `NCU UserInfo 端點回傳空字串 (HTTP ${res.status})，請確認權限或 Token 有效性`;
          console.error("[NCU UserInfo Error] Portal 回傳空內容 (HTTP " + res.status + ")");
          setAuthErrorDetail(errMsg);
          throw new Error(errMsg);
        }

        let data: any = {};
        try {
          data = JSON.parse(rawText);
        } catch {
          const errMsg = `NCU UserInfo 非有效 JSON: ${rawText.slice(0, 150)}`;
          console.error("[NCU UserInfo Error] 回傳非 JSON 內容:", { status: res.status, rawText });
          setAuthErrorDetail(errMsg);
          throw new Error(errMsg);
        }

        if (!res.ok || data.error) {
          const errMsg = data.error_description || data.error || `HTTP ${res.status}: NCU UserInfo 請求失敗`;
          console.error("[NCU UserInfo Error] 取得個人資料失敗:", { status: res.status, data });
          setAuthErrorDetail(errMsg);
          throw new Error(errMsg);
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
  async createUser(user: any) {
    const createdUser = await prisma.user.create({
      data: {
        ...user,
        points: 10, // 新用戶基本註冊獎勵 10 點
      },
    });

    try {
      await prisma.transactionRecord.create({
        data: {
          userId: createdUser.id,
          type: "EARN_REGISTER",
          amount: 10,
          description: "新用戶註冊獎勵",
        },
      });
      console.log(`[NextAuth Adapter] 新使用者建立成功並已發放 10 點註冊獎勵: ${createdUser.id} (${createdUser.email})`);
    } catch (txErr) {
      console.error("[NextAuth Adapter] 建立新用戶註冊獎勵紀錄失敗:", txErr);
    }

    return createdUser;
  },
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
      // 尋找真實的資料庫使用者 (因新用戶初次登入時 user.id 可能是 OAuth profile id)
      let dbUser = null;
      if (user?.id) {
        try {
          dbUser = await prisma.user.findFirst({
            where: {
              OR: [
                { id: user.id },
                ...(user.email ? [{ email: user.email }] : [])
              ]
            }
          });
        } catch (findErr) {
          console.error("尋找登入使用者失敗", findErr);
        }
      }

      // 確保透過第三方快速登入自動註冊的用戶皆享有 10 點新人註冊獎勵
      if (dbUser) {
        try {
          const hasReward = await prisma.transactionRecord.findFirst({
            where: {
              userId: dbUser.id,
              type: "EARN_REGISTER",
            },
          });

          if (!hasReward) {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { points: { increment: 10 } },
            });
            await prisma.transactionRecord.create({
              data: {
                userId: dbUser.id,
                type: "EARN_REGISTER",
                amount: 10,
                description: "新用戶註冊獎勵",
              },
            });
            console.log(`[Auth] 已為使用者 ${dbUser.id} 自動補發新用戶註冊獎勵 10 點！`);
          }
        } catch (rewardErr) {
          console.error("發放註冊獎勵檢查失敗", rewardErr);
        }
      }

      if (account?.provider === "line") {
        if (dbUser) {
          try {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { lineId: account.providerAccountId },
            });
          } catch (err) {
            console.error("LINE ID 綁定失敗", err);
          }
        }
      } else if (account?.provider === "ncu") {
        if (dbUser) {
          try {
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
          } catch (profileErr) {
            console.error("更新 NCU UserProfile 失敗", profileErr);
          }
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      const targetId = user?.id || token.id;
      if (user || trigger === "update") {
        if (user) {
          token.id = user.id;
          token.role = (user as any).role || "FREE";
          token.points = (user as any).points || 0;
        }

        try {
          const dbUser = await prisma.user.findFirst({
            where: {
              OR: [
                ...(targetId ? [{ id: targetId as string }] : []),
                ...(user?.email ? [{ email: user.email }] : [])
              ]
            },
            select: { 
              id: true, 
              name: true,
              role: true, 
              points: true,
              lineId: true,
              profile: {
                select: {
                  university: true,
                  department: true,
                  studentId: true,
                  realName: true,
                }
              }
            }
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role || "FREE";
            token.points = dbUser.points ?? 0;
            token.hasLineLinked = !!dbUser.lineId;
            token.isCampusVerified = !!dbUser.profile?.university;
            token.university = dbUser.profile?.university || null;
            token.department = dbUser.profile?.department || null;
            token.studentId = dbUser.profile?.studentId || null;
            token.realName = dbUser.profile?.realName || null;
          }
        } catch {
          // ignore
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).points = token.points as number;
        (session.user as any).hasLineLinked = !!token.hasLineLinked;
        (session.user as any).isCampusVerified = !!token.isCampusVerified;
        (session.user as any).university = token.university || null;
        (session.user as any).department = token.department || null;
        (session.user as any).studentId = token.studentId || null;
        (session.user as any).realName = token.realName || null;
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
    error: "/login",
  },
  logger: {
    error(code, metadata) {
      console.error(`[NextAuth Error] ${code}:`, metadata);
      const rawErr = (metadata as any)?.error || metadata;
      const innerErr = rawErr?.cause || rawErr?.error || rawErr;
      const msg = innerErr?.message || (typeof innerErr === "string" ? innerErr : "");
      if (msg && !msg.includes("OAuthCallbackError")) {
        setAuthErrorDetail(msg);
      }
    },
    warn(code) {
      console.warn(`[NextAuth Warn] ${code}`);
    },
    debug(code, metadata) {
      console.log(`[NextAuth Debug] ${code}`, metadata);
    },
  },
  debug: true,
  secret: process.env.NEXTAUTH_SECRET,
};
