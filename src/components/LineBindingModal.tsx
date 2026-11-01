"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LineBindingModal({ isOpen, onClose, onSuccess }: Props) {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [bindCode, setBindCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchBindCode();
    } else {
      setBindCode(null);
      setStatusMsg(null);
      setCopied(false);
    }
  }, [isOpen]);

  const fetchBindCode = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/user/line-bind-code", { method: "POST" });
      const data = await res.json();
      if (data.code) {
        setBindCode(data.code);
        setExpiresAt(data.expiresAt);
      } else {
        setStatusMsg("產生驗證碼失敗，請稍後再試");
      }
    } catch {
      setStatusMsg("連線異常，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!bindCode) return;
    const commandText = `綁定 ${bindCode}`;
    navigator.clipboard.writeText(commandText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/user/line-bind-code");
      const data = await res.json();
      if (data.isLinked) {
        setStatusMsg("🎉 恭喜！LINE 官方帳號已成功連動！");
        await update(); // 刷新前端 Session 狀態
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setStatusMsg("尚未偵測到綁定紀錄，請確認已在 LINE 聊天室送出「綁定 " + (bindCode || "") + "」");
      }
    } catch {
      setStatusMsg("查詢失敗，請稍後再試");
    } finally {
      setChecking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-surface border border-border rounded-lg shadow-2xl p-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#06C755] inline-block animate-pulse" />
            <h3 className="text-sm font-bold font-mono text-text-primary tracking-wide uppercase">
              [ 連動 LINE 官方帳號 // BIND LINE ]
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary p-1 text-xs font-mono transition-colors"
          >
            [✕ 關閉]
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs">
          <p className="text-text-secondary leading-relaxed">
            連動後，當您的筆記有人購買、收到點數打賞或留言回覆時，ForShare LINE 官方帳號將第一時間給您發送即時推播通知！
          </p>

          {/* Option 1: 6-Digit Code */}
          <div className="p-4 rounded-md bg-surface-muted border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-text-primary">[ 推薦方式：發送指令綁定 ]</span>
              {loading && <span className="text-[10px] text-text-tertiary font-mono">產生代碼中...</span>}
            </div>

            {bindCode ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-surface border border-border p-3 rounded-sm">
                  <div>
                    <span className="text-[10px] text-text-tertiary block font-mono">您的專屬綁定指令 (15分鐘有效)</span>
                    <span className="text-lg font-mono font-bold text-primary tracking-widest">
                      綁定 {bindCode}
                    </span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-xs bg-primary text-white font-mono text-[11px] font-semibold hover:bg-primary-light transition-colors"
                  >
                    {copied ? "已複製！" : "複製指令"}
                  </button>
                </div>

                <ol className="list-decimal list-inside text-[11px] text-text-tertiary space-y-1 pl-1">
                  <li>在手機 LINE 打開 ForShare 官方帳號對話框</li>
                  <li>貼上並傳送指令：<code className="text-text-primary font-bold">綁定 {bindCode}</code></li>
                  <li>收到機器人確認訊息後，點擊下方按鈕完成驗證</li>
                </ol>
              </div>
            ) : (
              <div className="py-4 text-center">
                <button
                  onClick={fetchBindCode}
                  disabled={loading}
                  className="px-4 py-1.5 rounded-sm bg-surface border border-border text-text-primary hover:border-text-primary font-mono text-xs transition-colors"
                >
                  {loading ? "處理中..." : "重新產生綁定碼"}
                </button>
              </div>
            )}
          </div>

          {/* Option 2: Direct OAuth Link */}
          <div className="flex items-center justify-between p-3 rounded-md border border-border/70 hover:border-text-primary transition-colors bg-surface">
            <div>
              <p className="font-bold text-text-primary">方式二：以 LINE 帳號一鍵授權</p>
              <p className="text-[10px] text-text-tertiary">適合已在電腦瀏覽器登入 LINE 的使用者</p>
            </div>
            <button
              onClick={() => signIn("line")}
              className="px-3 py-1.5 rounded-xs bg-[#06C755] hover:bg-[#05b34c] text-white font-semibold text-[11px] transition-colors"
            >
              LINE 授權連動
            </button>
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div className={`p-2.5 rounded-sm text-xs font-mono ${
              statusMsg.includes("🎉") 
                ? "bg-success/10 text-success border border-success/30" 
                : "bg-error/10 text-error border border-error/30"
            }`}>
              {statusMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-border flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-sm border border-border text-text-secondary hover:text-text-primary text-xs font-mono transition-colors"
          >
            稍後再說
          </button>
          <button
            onClick={handleCheckStatus}
            disabled={checking}
            className="px-4 py-1.5 rounded-sm bg-primary text-white text-xs font-semibold hover:bg-primary-light transition-colors disabled:opacity-50"
          >
            {checking ? "驗證中..." : "我已在 LINE 傳送指令，確認綁定"}
          </button>
        </div>
      </div>
    </div>
  );
}
