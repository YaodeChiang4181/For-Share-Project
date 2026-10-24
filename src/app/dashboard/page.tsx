import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import LineBindButton from "@/components/LineBindButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  let user: any = null;
  let recentTransactions: any[] = [];
  let dbError: string | null = null;

  try {
    // 取得最新用戶資料
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        _count: {
          select: { posts: true, comments: true },
        },
      },
    });

    if (!user) {
      redirect("/login");
    }

    // 檢查每日登入獎勵
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let lastLoginDate = new Date(0);
    if (user.lastLoginAt) {
      lastLoginDate = new Date(user.lastLoginAt);
      lastLoginDate.setHours(0, 0, 0, 0);
    }

    if (lastLoginDate.getTime() < today.getTime()) {
      // 跨日登入，給予獎勵 (循序執行，相容 Neon HTTP 傳輸層)
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          points: { increment: 1 },
          lastLoginAt: new Date()
        }
      });
      await prisma.transactionRecord.create({
        data: {
          userId: user.id,
          type: "EARN_DAILY_LOGIN",
          amount: 1,
          description: "每日登入獎勵",
        }
      });
      
      // 更新本地顯示數值
      user.points += 1;
    }


    // 取得最近的交易紀錄
    recentTransactions = await prisma.transactionRecord.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
  } catch (error: any) {
    dbError = error.message || String(error);
  }

  const statCards = [
    {
      label: "目前積分",
      value: user.points.toLocaleString(),
      code: "PTS",
    },
    {
      label: "上傳筆記",
      value: user._count.posts.toString(),
      code: "DOC",
    },
    {
      label: "留言數量",
      value: user._count.comments.toString(),
      code: "COM",
    },
    {
      label: "會員等級",
      value: user.role === "SHARE_VIP" ? "Share VIP" : user.role === "ADMIN" ? "管理員" : "一般會員",
      code: "TIER",
    },
  ];

  if (dbError) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="bg-error/10 border border-error text-error p-6 rounded-2xl">
            <h2 className="text-xl font-bold mb-2">資料載入失敗 (Server Error)</h2>
            <p className="font-mono text-sm whitespace-pre-wrap">{dbError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Welcome Header */}
        <div className="mb-8">
          <span className="text-xs font-mono tracking-wider text-text-tertiary uppercase block mb-1">
            [ DASHBOARD // 個人儀表板 ]
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-1">
            嗨，{user.name}
          </h1>
          <p className="text-xs text-text-secondary">
            歡迎回到 ForShare 校園知識庫。
          </p>
        </div>

        {/* Invite Code Banner */}
        <div className="mb-8 p-5 rounded-md bg-surface border border-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold text-text-primary">[ 專屬推薦碼 ]</span>
                {user.inviteRewardReceived && (
                  <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-mono bg-success/10 text-success border border-success/20">
                    已核發推廣獎勵
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                分享給朋友註冊，當朋友首次上傳筆記或打賞時，<strong className="text-text-primary">雙方皆可獲得 10 點積分！</strong>
                <span className="text-text-tertiary font-mono ml-1">(每位邀請人限領取一次額外獎勵)</span>
              </p>
            </div>
            <code className="px-3.5 py-1.5 rounded-xs bg-surface-muted border border-border text-text-primary font-mono font-bold text-xs tracking-wider">
              {user.inviteCode}
            </code>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="paper-card p-5 bg-surface"
            >
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-[10px] font-mono text-text-tertiary">[{card.code}]</span>
                <span className="text-xs font-mono text-text-tertiary">{card.label}</span>
              </div>
              <p className="text-2xl font-bold font-mono text-text-primary">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions + Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-1 p-6 rounded-md bg-surface border border-border">
            <h2 className="text-sm font-bold font-mono tracking-wider text-text-primary mb-4 uppercase">
              [ 快捷操作 // ACTIONS ]
            </h2>
            <div className="space-y-2">
              <Link
                href="/upload"
                className="flex items-center justify-between p-3 rounded-sm border border-border/60 hover:border-text-primary transition-colors group"
              >
                <div>
                  <p className="text-xs font-bold text-text-primary">上傳筆記</p>
                  <p className="text-[11px] text-text-tertiary">整理講義，累積同儕積分</p>
                </div>
                <span className="font-mono text-xs text-text-tertiary group-hover:text-text-primary transition-colors">→</span>
              </Link>
              <Link
                href="/explore"
                className="flex items-center justify-between p-3 rounded-sm border border-border/60 hover:border-text-primary transition-colors group"
              >
                <div>
                  <p className="text-xs font-bold text-text-primary">探索知識庫</p>
                  <p className="text-[11px] text-text-tertiary">檢索系所筆記與期中考古</p>
                </div>
                <span className="font-mono text-xs text-text-tertiary group-hover:text-text-primary transition-colors">→</span>
              </Link>
              <Link
                href="/shop"
                className="flex items-center justify-between p-3 rounded-sm border border-border/60 hover:border-text-primary transition-colors group"
              >
                <div>
                  <p className="text-xs font-bold text-text-primary">積分兌換商城</p>
                  <p className="text-[11px] text-text-tertiary">兌換超商商品卡與禮券</p>
                </div>
                <span className="font-mono text-xs text-text-tertiary group-hover:text-text-primary transition-colors">→</span>
              </Link>
              
              {/* LINE 綁定按鈕 */}
              <div className="pt-2">
                <LineBindButton isLinked={!!user.lineId} />
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="lg:col-span-2 p-6 rounded-md bg-surface border border-border">
            <h2 className="text-sm font-bold font-mono tracking-wider text-text-primary mb-4 uppercase">
              [ 近期交易紀錄 // TRANSACTIONS ]
            </h2>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs font-mono text-text-tertiary mb-1">[ NO TRANSACTION RECORDS ]</p>
                <p className="text-xs text-text-secondary">目前尚無點數交易紀錄</p>
                <p className="text-[11px] text-text-tertiary mt-1">上傳筆記或打賞同儕筆記即可累積記錄。</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-background"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                        tx.amount > 0 ? "bg-success/10 text-success" : "bg-error/10 text-error"
                      }`}>
                        {tx.amount > 0 ? "+" : "−"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{tx.description}</p>
                        <p className="text-xs text-text-tertiary">
                          {new Date(tx.createdAt).toLocaleDateString("zh-TW")}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${
                      tx.amount > 0 ? "text-success" : "text-error"
                    }`}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount} 點
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
