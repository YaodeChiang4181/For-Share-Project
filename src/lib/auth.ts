import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import LineProvider from "next-auth/providers/line";
import { PrismaAdapter } from "@auth/prisma-adapter";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
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
           await prisma.user.update({
             where: { id: user.id },
             data: { lineId: account.providerAccountId }
           });
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
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
