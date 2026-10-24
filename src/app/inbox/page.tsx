import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect("/login");
  }

  let messages: any[] = [];
  let dbError: string | null = null;

  try {
    messages = await prisma.inboxMessage.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" }
    });
  } catch (error: any) {
    dbError = error.message || String(error);
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono tracking-wider text-text-tertiary uppercase block mb-1">
              [ INBOX // 系統收件匣 ]
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-1">系統信箱</h1>
            <p className="text-xs text-text-secondary">您兌換的禮券與系統通知皆記錄於此。</p>
          </div>
          <Link href="/shop" className="px-3.5 py-1.5 bg-surface border border-border rounded-sm text-xs font-semibold hover:border-text-primary transition-colors">
            返回商城
          </Link>
        </div>

        {dbError && (
          <div className="bg-error/10 border border-error text-error p-6 rounded-md mb-8">
            <h2 className="text-sm font-bold mb-1">資料載入失敗 (Server Error)</h2>
            <p className="font-mono text-xs whitespace-pre-wrap">{dbError}</p>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="paper-card p-12 text-center bg-surface">
            <div className="font-mono text-xs text-text-tertiary mb-3">[ NO MESSAGES // 信箱目前為空 ]</div>
            <h3 className="text-base font-bold text-text-primary mb-1">尚無任何新訊息或禮物</h3>
            <p className="text-xs text-text-secondary mb-6">您完成筆記積分兌換後，憑證將會發送至此處。</p>
            <Link href="/shop" className="px-5 py-2.5 bg-primary text-white rounded-sm text-xs font-semibold hover:bg-primary-light transition-colors inline-block">
              前往積分商城 →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg) => (
              <div key={msg.id} className="paper-card p-6 bg-surface relative overflow-hidden">
                {!msg.isRead && (
                  <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-accent" />
                )}
                
                <h3 className="text-base font-bold text-text-primary mb-1.5 pr-6">
                  {msg.title}
                </h3>
                <div className="text-[11px] font-mono text-text-tertiary mb-3">
                  {new Date(msg.createdAt).toLocaleString("zh-TW")}
                </div>
                
                <p className="text-text-secondary text-xs leading-relaxed mb-5">
                  {msg.content}
                </p>
                
                {msg.barcode && !msg.actionUrl && (
                  <div className="mt-4 p-5 bg-white border border-border rounded-sm flex flex-col items-center justify-center gap-2 w-fit mx-auto">
                    <div className="text-xs font-mono text-text-secondary mb-1">[ 請向門市出示此條碼 ]</div>
                    {/* 使用開源的 bwip-js API 產生條碼圖片 */}
                    <img 
                      src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${msg.barcode}&scale=3&height=10&includetext`} 
                      alt="禮物條碼"
                      className="max-w-full h-auto mix-blend-multiply"
                    />
                    <div className="mt-2 px-3 py-1 bg-surface-muted border border-border rounded-xs text-xs font-mono text-text-primary font-bold tracking-widest">
                      序號: {msg.barcode}
                    </div>
                  </div>
                )}

                {msg.actionUrl && (
                  <div className="mt-5 flex flex-col items-center">
                    <a 
                      href={msg.actionUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-6 py-2.5 bg-primary text-white text-xs font-semibold rounded-sm hover:bg-primary-light transition-colors inline-flex items-center gap-2"
                    >
                      開啟實體票券憑證 (條碼) →
                    </a>
                    <div className="mt-2 text-[11px] font-mono text-text-tertiary">
                      交易序號參考: {msg.barcode} (請以票券頁面實際條碼為準)
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
