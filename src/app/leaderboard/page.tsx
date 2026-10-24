import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  let topUsers: any[] = [];
  let errorMsg: string | null = null;
  
  try {
    topUsers = await prisma.user.findMany({
      orderBy: { points: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        points: true,
        role: true,
        profile: {
          select: {
            university: true,
          },
        },
        image: true,
      },
    });
  } catch (error: any) {
    errorMsg = error.message || String(error);
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 -right-40 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <span className="text-xs font-mono tracking-wider text-text-tertiary uppercase block mb-2">
            [ LEADERBOARD // 知識貢獻排行 ]
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3 tracking-tight">
            財富排行榜
          </h1>
          <p className="text-sm text-text-secondary">
            依照平台筆記分享與社群打賞累積之積分總額排行。
          </p>
        </div>

        {errorMsg && (
          <div className="bg-error/10 border border-error text-error p-6 rounded-2xl mb-8">
            <h2 className="text-xl font-bold mb-2">資料載入失敗 (Server Error)</h2>
            <p className="font-mono text-sm whitespace-pre-wrap">{errorMsg}</p>
          </div>
        )}

        {topUsers.length === 0 ? (
          <div className="paper-card p-12 text-center">
            <div className="font-mono text-xs text-text-tertiary mb-3">[ EMPTY RANK // 尚無紀錄 ]</div>
            <h2 className="text-xl font-bold text-text-primary mb-2">目前尚無排名紀錄</h2>
            <p className="text-text-secondary text-sm mb-6">
              搶先做第一人！上傳筆記，將你的名字記錄在榜首。
            </p>
            <Link
              href="/upload"
              className="inline-flex px-8 py-3 rounded-full text-sm font-semibold text-white bg-primary hover:bg-primary-dark shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              立刻上傳筆記賺積分
            </Link>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-2xl shadow-lg overflow-hidden flex flex-col">
            <div className="divide-y divide-border">
              {topUsers.map((user, index) => {
                const isTop3 = index < 3;
                return (
                  <div key={user.id} className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-background/50 transition-colors">
                    <div className="flex items-center gap-6">
                      {/* Rank Badge */}
                      <div className={`shrink-0 w-10 h-10 rounded-sm flex items-center justify-center font-mono font-bold text-sm ${
                        index === 0 ? "bg-primary text-white" :
                        index === 1 ? "bg-surface-muted text-text-primary border border-border" :
                        index === 2 ? "bg-surface-muted text-text-secondary border border-border" :
                        "bg-background border border-border text-text-tertiary"
                      }`}>
                        {index + 1}
                      </div>
                      
                      {/* User Info */}
                      <div className="flex items-center gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-sm bg-surface-muted border border-border flex items-center justify-center">
                          <span className="font-bold text-sm text-text-primary">
                            {user.name?.charAt(0)?.toUpperCase() || "U"}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-text-primary text-base line-clamp-1">
                              {user.name}
                            </h3>
                            {user.role === "SHARE_VIP" || user.role === "VIP" ? (
                              <span className="shrink-0 px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold bg-surface-muted text-text-primary border border-border">
                                [ SHARE VIP ]
                              </span>
                            ) : user.role === "ADMIN" ? (
                              <span className="shrink-0 px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold bg-error/10 text-error border border-error/20">
                                [ 管理員 ]
                              </span>
                            ) : (
                              <span className="shrink-0 px-2 py-0.5 rounded-xs text-[10px] font-mono text-text-tertiary border border-border">
                                一般會員
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-tertiary line-clamp-1 font-mono">
                            {user.profile?.university || "未填寫學校"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Points */}
                    <div className="sm:text-right flex sm:block items-end gap-2 pl-18 sm:pl-0">
                      <div className="font-bold text-2xl text-text-primary font-mono tracking-tight">
                        {user.points}
                      </div>
                      <div className="text-xs text-text-tertiary font-mono">PTS</div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Slogan behind the leaderboard */}
            <div className="p-8 text-center border-t border-border mt-auto bg-surface">
              <h3 className="text-xl font-bold text-text-primary mb-2">搶先做第一人</h3>
              <p className="text-sm text-text-secondary mb-6">立刻上傳優質筆記，累積評分與社群回饋</p>
              <Link
                href="/upload"
                className="inline-flex px-6 py-2.5 rounded-sm text-xs font-semibold text-white bg-primary hover:bg-primary-light transition-colors gap-2 items-center"
              >
                <span>前往上傳筆記</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
