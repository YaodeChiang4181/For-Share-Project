"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const TOPUP_OPTIONS = [
  { amount: 50, points: 50, bonus: 0 },
  { amount: 150, points: 150, bonus: 10 },
  { amount: 300, points: 300, bonus: 30 },
  { amount: 500, points: 500, bonus: 100 },
];

export default function TopupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number>(150);

  const handleTopup = async () => {
    if (status !== "authenticated") {
      router.push("/login");
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch("/api/payments/create", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "POINTS_TOPUP", amount: selectedOption })
      });
      
      if (res.ok) {
        const { html } = await res.json();
        document.body.insertAdjacentHTML('beforeend', html);
      } else {
        const data = await res.json();
        alert(data.error || "建立訂單失敗，請稍後再試");
        setIsProcessing(false);
      }
    } catch (err) {
      alert("網路錯誤，請稍後再試");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-background relative overflow-hidden">
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-text-primary mb-2">💰 儲值積分</h1>
            <p className="text-text-secondary">使用綠界金流購買積分，立刻兌換喜歡的商品。</p>
          </div>
          <Link href="/shop" className="px-4 py-2 bg-surface border border-border rounded-lg text-sm font-semibold hover:bg-background transition-colors shadow-sm">
            返回商城
          </Link>
        </div>

        <div className="bg-surface rounded-3xl p-8 border border-border shadow-xl">
          <h3 className="text-xl font-bold text-text-primary mb-6">選擇儲值方案</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {TOPUP_OPTIONS.map((opt) => (
              <div 
                key={opt.amount}
                onClick={() => !isProcessing && setSelectedOption(opt.amount)}
                className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedOption === opt.amount 
                    ? "border-primary bg-primary/5 shadow-md scale-[1.02]" 
                    : "border-border hover:border-primary/50 hover:bg-surface-hover"
                }`}
              >
                {opt.bonus > 0 && (
                  <div className="absolute -top-3 -right-3 bg-error text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm animate-pulse">
                    額外贈送 {opt.bonus} 點
                  </div>
                )}
                <div className="flex justify-between items-center mb-2">
                  <div className="text-2xl font-black text-text-primary">
                    {opt.points + opt.bonus} <span className="text-sm font-bold text-text-secondary">點積分</span>
                  </div>
                </div>
                <div className="text-text-tertiary text-sm">
                  NT$ {opt.amount}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 mb-8">
            <div className="p-4 bg-background rounded-xl border border-border/50 text-sm text-text-secondary text-center flex flex-col items-center gap-2">
              <div>本站採用綠界科技 ECPay 第三方金流服務，保障您的交易安全。</div>
              <div className="flex justify-center gap-3 text-2xl opacity-70">
                💳 📱 🏦
              </div>
            </div>
          </div>

          <button
            onClick={handleTopup}
            disabled={isProcessing}
            className="w-full py-4 rounded-xl text-white font-bold text-lg bg-primary hover:bg-primary-dark shadow-lg shadow-primary/30 transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>處理付款中...</span>
              </>
            ) : (
              `立即支付 NT$ ${selectedOption}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
