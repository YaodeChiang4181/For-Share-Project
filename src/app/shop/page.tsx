"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const SHOP_ITEMS = [
  { id: "item-1", name: "7-11 50元 電子禮券", pointsCost: 50, desc: "憑條碼至門市兌換等值商品" },
  { id: "item-2", name: "全家 100元 購物金", pointsCost: 100, desc: "憑條碼至門市兌換等值商品" },
  { id: "item-3", name: "星巴克 150元 飲品券", pointsCost: 150, desc: "憑條碼兌換任一 150 元內飲品" },
  { id: "item-4", name: "Line Points 200點", pointsCost: 200, desc: "將直接匯入您的 Line 帳號" },
];

export default function ShopPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // 總體經濟狀態
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [nextUpdate, setNextUpdate] = useState<string | null>(null);

  useEffect(() => {
    // 取得當前總體經濟匯率
    fetch("/api/economy/status")
      .then(res => res.json())
      .then(data => {
        if (data.rate) setExchangeRate(data.rate);
        if (data.nextUpdate) setNextUpdate(new Date(data.nextUpdate).toLocaleDateString("zh-TW"));
      })
      .catch(console.error);
  }, []);

  const handleRedeem = async (item: typeof SHOP_ITEMS[0]) => {
    if (!session) {
      router.push("/login");
      return;
    }

    setLoadingId(item.id);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const finalCost = item.pointsCost * exchangeRate;
      
      const res = await fetch("/api/shop/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          pointsCost: finalCost,
          itemName: item.name
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresUpgrade) {
          setErrorMsg(data.error);
        } else {
          setErrorMsg(data.error || "兌換失敗");
        }
      } else {
        setSuccessMsg(data.message);
        update(); // 重新獲取 session (更新餘額)
      }
    } catch (err) {
      setErrorMsg("網路錯誤，請稍後再試");
    } finally {
      setLoadingId(null);
    }
  };

  const currentPoints = (session?.user as any)?.points || 0;
  const role = (session?.user as any)?.role || "FREE";

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-text-primary mb-4">積分兌換商城</h1>
          <p className="text-lg text-text-secondary">將您的知識產出變現，兌換豐富好禮！</p>
        </div>

        {/* 帳戶狀態面板 */}
        <div className="bg-surface border border-border rounded-md p-6 mb-8 flex flex-col sm:flex-row items-center justify-between shadow-sm">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <div className="w-12 h-12 rounded-sm bg-surface-muted border border-border flex items-center justify-center">
              <span className="text-lg text-text-primary font-mono font-bold">
                {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
            <div>
              <div className="text-xs font-mono text-text-tertiary mb-1">CURRENT BALANCE</div>
              <div className="text-2xl font-bold text-text-primary font-mono">{currentPoints} <span className="text-xs text-text-tertiary">PTS</span></div>
            </div>
          </div>
          
          <div className="text-center sm:text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xs bg-surface-muted border border-border mb-3 font-mono text-xs">
              <span className="text-text-secondary">會員狀態：</span>
              {role === "ADMIN" ? (
                <span className="font-bold text-error">[ 管理員 (無上限) ]</span>
              ) : role === "VIP" || role === "SHARE_VIP" ? (
                <span className="font-bold text-text-primary">[ SHARE VIP (無上限) ]</span>
              ) : (
                <span className="text-text-secondary">一般會員 (每月上限 {50 * exchangeRate} 點)</span>
              )}
            </div>
            
            <div className="flex gap-3 mt-2">
              {role === "FREE" && (
                <Link href="/upgrade" className="flex-1 text-center px-4 py-2 bg-primary text-white rounded-sm text-xs font-semibold hover:bg-primary-light transition-colors">
                  升級無限兌換 →
                </Link>
              )}
              <Link href="/topup" className="flex-1 text-center px-4 py-2 bg-surface border border-border text-text-primary rounded-sm text-xs font-semibold hover:border-text-primary transition-colors">
                儲值積分
              </Link>
            </div>
          </div>
        </div>

        {/* 經濟儀表板 (匯率公告) */}
        <div className="bg-surface border border-border rounded-md p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-text-tertiary">[ 總體經濟指標 ]</span>
            </div>
            <p className="text-xs text-text-secondary">
              受全站積分供給與流通量影響，當前物價調整係數為 <strong className="font-mono text-text-primary">{exchangeRate.toFixed(1)}x</strong>。
            </p>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-[11px] font-mono text-text-tertiary mb-1">下次結算更新日</div>
            <div className="text-xs font-mono font-medium text-text-primary bg-surface-muted px-2.5 py-1 rounded-xs border border-border">
              {nextUpdate || "載入中..."}
            </div>
          </div>
        </div>

        {/* 錯誤與成功訊息 */}
        {errorMsg && (
          <div className="mb-8 p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm font-semibold flex items-center gap-2">
            {errorMsg}
            {errorMsg.includes("升級") && (
              <Link href="/upgrade" className="ml-auto px-3 py-1 bg-error text-white rounded shadow-sm hover:bg-error/90 transition-colors">
                前往升級
              </Link>
            )}
          </div>
        )}
        
        {successMsg && (
          <div className="mb-8 p-4 bg-success/10 border border-success/20 rounded-xl text-success text-sm font-semibold flex items-center gap-2">
            {successMsg}
            <Link href="/inbox" className="ml-auto px-3 py-1 bg-success text-white rounded shadow-sm hover:bg-success/90 transition-colors">
              開啟信箱
            </Link>
          </div>
        )}

        {/* 商品列表 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {SHOP_ITEMS.map((item) => {
            const finalCost = item.pointsCost * exchangeRate;
            return (
              <div key={item.id} className="bg-surface border border-border rounded-2xl p-6 hover:shadow-md transition-shadow flex flex-col relative overflow-hidden">
                {exchangeRate > 1.0 && (
                  <div className="absolute top-4 right-4 text-xs font-bold text-error bg-error/10 px-2 py-1 rounded border border-error/20">
                    物價已調漲
                  </div>
                )}
                <h3 className="text-xl font-bold text-text-primary mb-2 mt-2">{item.name}</h3>
                <p className="text-text-secondary text-sm mb-6 flex-1">{item.desc}</p>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                  <div className="flex flex-col">
                    <div className="text-xl font-extrabold text-primary font-mono leading-none">
                      {finalCost} <span className="text-sm text-text-tertiary font-sans">點</span>
                    </div>
                    {exchangeRate > 1.0 && (
                      <div className="text-xs text-text-tertiary line-through mt-1">原價 {item.pointsCost} 點</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRedeem(item)}
                    disabled={loadingId === item.id || currentPoints < finalCost}
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all ${
                      currentPoints < finalCost 
                        ? "bg-background border border-border text-text-tertiary cursor-not-allowed"
                        : "bg-primary text-white hover:bg-primary-dark hover:scale-[1.02] active:scale-[0.98]"
                    }`}
                  >
                    {loadingId === item.id ? "處理中..." : currentPoints < finalCost ? "餘額不足" : "立即兌換"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
