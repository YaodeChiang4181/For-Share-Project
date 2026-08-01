"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function UpgradeSuccessPage() {
  const { update } = useSession();
  const router = useRouter();

  useEffect(() => {
    // 重新載入 Session 確保前端抓到最新的 VIP 或積分狀態
    update();
    
    // 3 秒後自動導回商城
    const timer = setTimeout(() => {
      router.push("/shop");
    }, 4000);
    return () => clearTimeout(timer);
  }, [update, router]);

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-background relative overflow-hidden flex items-center justify-center">
      <div className="bg-surface border border-border rounded-3xl p-16 text-center shadow-xl animate-fade-in-up max-w-lg w-full">
        <div className="text-7xl mb-6 animate-bounce">🎉</div>
        <h1 className="text-3xl font-extrabold text-text-primary mb-4">付款成功！</h1>
        <p className="text-lg text-text-secondary mb-8">
          感謝您的支持，系統已收到來自綠界金流的確認。您的訂單權益 (VIP 或 儲值積分) 已經自動發放至您的帳戶。
        </p>
        <div className="text-text-tertiary mb-6">正在為您重新載入資料並跳轉至商城...</div>
        <Link href="/shop" className="px-6 py-2.5 bg-primary text-white rounded-full text-sm font-bold shadow-md hover:bg-primary-dark transition-colors inline-block">
          手動前往商城
        </Link>
      </div>
    </div>
  );
}
