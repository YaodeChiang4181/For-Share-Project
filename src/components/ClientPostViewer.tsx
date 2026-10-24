"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

// 注意事項 10：確保所有瀏覽器 API 呼叫都在 Client 環境下執行
const isBrowser = typeof window !== "undefined";

interface PostProps {
  post: {
    id: string;
    title: string;
    content: string;
    fileUrl: string | null;
    isPaid: boolean;
    authorId: string;
    author: { name: string | null };
  };
  currentUserId: string | undefined;
  totalTips?: number;
  tipCount?: number;
}

function cleanNoteText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/[\u{10000}-\u{10ffff}\u2600-\u27bf\u2300-\u23ff\u2b50-\u2b55\u203c-\u2049]/gu, "")
    .replace(/\*\*AI 摘要懶人包\*\*/g, "[ 內容摘要 ]")
    .trim();
}

export default function ClientPostViewer({ post, currentUserId, totalTips = 0, tipCount = 0 }: PostProps) {
  const router = useRouter();
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ============ 檢舉 Modal ============
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [customReason, setCustomReason] = useState(""); // 注意事項 8：「其他」的自訂輸入
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportMsg, setReportMsg] = useState("");

  // 注意事項 10：Mounted 標記，防止 SSR 階段呼叫瀏覽器 API
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // ============ 停留時間追蹤 (注意事項 5, 6, 7) ============
  const startTimeRef = useRef(Date.now());
  const roundsRef = useRef(0);
  const roundTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showStillHere, setShowStillHere] = useState(false);
  const hasSentDwellRef = useRef(false);

  const isOwnPost = currentUserId === post.authorId;

  // 發送停留時間到後端
  const sendDwellTime = useCallback(() => {
    if (hasSentDwellRef.current) return;
    hasSentDwellRef.current = true;

    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);

    // 注意事項 7：3 秒以下不發送
    if (elapsed < 3) return;

    // 注意事項 10：確保不在 SSR 階段呼叫瀏覽器 API
    if (!isBrowser) return;

    // 使用 navigator.sendBeacon 確保關閉分頁時也能送出
    const payload = JSON.stringify({ postId: post.id, duration: elapsed });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/dwell", new Blob([payload], { type: "application/json" }));
    } else {
      fetch("/api/analytics/dwell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(console.error);
    }
  }, [post.id]);

  useEffect(() => {
    // 注意事項 10：確保只在 Client 環境執行
    if (!isBrowser) return;

    // 注意事項 6：每超過 60 秒為一圈，圈數達 5 圈跳出「你還在使用嗎？」
    roundTimerRef.current = setInterval(() => {
      roundsRef.current += 1;
      if (roundsRef.current >= 5) {
        // 到達 5 圈 (5 分鐘)，暫停計時並彈出確認
        if (roundTimerRef.current) clearInterval(roundTimerRef.current);
        setShowStillHere(true);
      }
    }, 60000); // 每 60 秒一圈

    // 注意事項 5：掛載 beforeunload 與 visibilitychange
    const handleBeforeUnload = () => sendDwellTime();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        sendDwellTime();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      // 元件 unmount 時也送出
      sendDwellTime();
      if (roundTimerRef.current) clearInterval(roundTimerRef.current);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sendDwellTime]);

  // 使用者確認「還在使用」→ 重置圈數、繼續計時
  const handleStillHereConfirm = () => {
    setShowStillHere(false);
    roundsRef.current = 0;
    roundTimerRef.current = setInterval(() => {
      roundsRef.current += 1;
      if (roundsRef.current >= 5) {
        if (roundTimerRef.current) clearInterval(roundTimerRef.current);
        setShowStillHere(true);
      }
    }, 60000);
  };

  // 使用者確認「已不在使用」→ 判定為無效、停止計時並送出目前秒數
  const handleStillHereCancel = useCallback(() => {
    setShowStillHere(false);
    sendDwellTime();
    router.push("/");
  }, [sendDwellTime, router]);

  // 注意事項 6：通知跳出後 10 秒無回應自動跳轉
  useEffect(() => {
    if (showStillHere) {
      const timer = setTimeout(() => {
        handleStillHereCancel();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showStillHere, handleStillHereCancel]);

  // ============ 強制打賞機制 ============
  useEffect(() => {
    if (isOwnPost || !post.isPaid) return;

    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      setShowTipModal(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isOwnPost, post.isPaid]);

  const handleExitClick = () => {
    if (isOwnPost || !post.isPaid) {
      router.push("/explore");
    } else {
      setShowTipModal(true);
    }
  };

  const submitTipAndExit = async () => {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, amount: tipAmount }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "打賞失敗，請確認積分餘額");
        setSubmitting(false);
        return;
      }

      router.push("/explore");
    } catch (err) {
      console.error(err);
      setError("網路錯誤，請稍後再試");
      setSubmitting(false);
    }
  };

  // ============ 檢舉送出 ============
  const submitReport = async () => {
    if (!reportReason) {
      setReportMsg("[ 提示 ] 請選擇檢舉理由");
      return;
    }

    // 注意事項 8 + 9：「其他」必須附帶自訂理由，前端先做基本驗證
    if (reportReason === "其他") {
      const trimmedCustom = customReason.trim();
      if (trimmedCustom.length < 5) {
        setReportMsg("[ 提示 ] 請在「其他」欄位中填寫至少 5 個字的說明");
        return;
      }
    }

    setReportSubmitting(true);
    setReportMsg("");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          reason: reportReason,
          customReason: reportReason === "其他" ? customReason.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReportMsg(`[ 錯誤 ] ${data.error}`);
      } else {
        setReportMsg("[ 成功 ] " + data.message);
        setTimeout(() => {
          setShowReportModal(false);
          setReportReason("");
          setCustomReason("");
          setReportMsg("");
        }, 1500);
      }
    } catch {
      setReportMsg("[ 錯誤 ] 網路連線錯誤，請稍後再試");
    } finally {
      setReportSubmitting(false);
    }
  };

  const getFileType = (url: string | null) => {
    if (!url) return 'unknown';
    if (url.startsWith('data:')) {
      if (url.startsWith('data:image/')) return 'image';
      if (url.startsWith('data:application/pdf')) return 'pdf';
      return 'other';
    }
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i)) return 'image';
    if (lowerUrl.match(/\.pdf(\?.*)?$/i)) return 'pdf';
    return 'other';
  };

  const getDownloadUrl = (url: string) => {
    if (url.startsWith('data:')) return url;
    return `/api/download?url=${encodeURIComponent(url)}`;
  };

  return (
    <>
      <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-surface">
        <div className="mx-auto max-w-4xl relative">
          
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={handleExitClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-background border border-border text-text-secondary hover:text-text-primary hover:border-primary/50 transition-colors"
            >
              <span>←</span> 離開筆記
            </button>
            <div className="flex items-center gap-3">
              {/* 注意事項 8：檢舉按鈕，二次確認，視覺權重低 */}
              {!isOwnPost && currentUserId && (
                <button
                  onClick={() => { setShowReportModal(true); setReportMsg(""); setReportReason(""); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xs text-xs font-mono text-error/80 border border-error/20 hover:bg-error/10 hover:text-error transition-colors"
                >
                  [ 檢舉此篇 ]
                </button>
              )}
              <div className="text-xs font-mono text-text-tertiary border border-border px-2.5 py-0.5 rounded-xs">
                閱讀模式
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-md shadow-sm p-8 md:p-12">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4 leading-tight">
              {cleanNoteText(post.title)}
            </h1>
            
            {/* 迴響統計 */}
            <div className="flex items-center gap-2 mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-surface-muted border border-border text-text-primary text-xs font-mono font-medium">
                <span>[ 迴響總計 ]</span>
                <span>{totalTips} 點</span>
              </div>
              <span className="text-xs font-mono text-text-tertiary">
                ({tipCount} 人次同儕打賞)
              </span>
            </div>
            
            <div className="flex items-center gap-3 mb-10 pb-6 border-b border-border">
              <div className="w-8 h-8 rounded-xs bg-surface-muted border border-border flex items-center justify-center font-mono text-xs font-bold text-text-primary">
                {post.author.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div>
                <p className="text-xs font-bold text-text-primary">{post.author.name}</p>
                <p className="text-[10px] font-mono text-text-tertiary">發布作者</p>
              </div>
            </div>

            <div className="prose max-w-none mb-10">
              <p className="text-text-secondary leading-relaxed whitespace-pre-wrap text-sm">
                {cleanNoteText(post.content)}
              </p>
            </div>

            {post.fileUrl && (
              <div className="mt-10 p-6 rounded-md bg-surface-muted border border-border flex flex-col items-center justify-center text-center">
                <div className="font-mono text-xs text-text-tertiary mb-2">[ ATTACHMENT // 附件檔案 ]</div>
                <h3 className="text-sm font-bold text-text-primary mb-3">線上附加檔案預覽</h3>
                
                <div className="w-full mb-6 mt-2 border border-border rounded-xs overflow-hidden bg-background">
                  {getFileType(post.fileUrl) === 'image' && (
                    <img src={getDownloadUrl(post.fileUrl)} alt="Preview" className="max-w-full h-auto mx-auto max-h-[600px] object-contain" />
                  )}
                  {getFileType(post.fileUrl) === 'pdf' && (
                    <iframe src={getDownloadUrl(post.fileUrl)} className="w-full h-[600px] border-none bg-white" title="PDF Preview" />
                  )}
                  {getFileType(post.fileUrl) === 'other' && (
                    <div className="p-12 text-text-secondary flex flex-col items-center text-xs font-mono">
                      <p>此格式未支援線上直接預覽，請點擊下方按鈕下載檢視原檔。</p>
                    </div>
                  )}
                </div>

                <a
                  href={getDownloadUrl(post.fileUrl)}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2.5 rounded-sm text-xs font-semibold text-white bg-primary hover:bg-primary-light transition-colors"
                >
                  下載 / 檢視原檔 →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============ 「你還在使用嗎？」確認 Modal (注意事項 6) ============ */}
      {showStillHere && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface w-full max-w-sm rounded-md shadow-2xl border border-border p-8 text-center animate-slide-up">
            <div className="font-mono text-xs text-text-tertiary mb-3">[ SESSION CHECK // 閱讀計時 ]</div>
            <h2 className="text-lg font-bold text-text-primary mb-2">確認您仍在閱讀中嗎？</h2>
            <p className="text-xs text-text-secondary mb-6 leading-relaxed">
              您已閱讀這篇筆記超過 5 分鐘。<br />
              為了維持學習停留時間統計之準確性，請確認您的在線狀態。
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleStillHereCancel}
                className="flex-1 py-3 rounded-xl text-sm font-bold border border-border text-text-secondary hover:bg-background transition-colors"
              >
                已經離開
              </button>
              <button
                onClick={handleStillHereConfirm}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-dark transition-all"
              >
                還在閱讀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 檢舉 Modal (注意事項 8, 9, 10) ============ */}
      {isMounted && showReportModal && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface w-full max-w-md rounded-3xl shadow-2xl border border-border p-8 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-text-primary">檢舉此篇筆記</h2>
              <button
                onClick={() => { setShowReportModal(false); setReportReason(""); setCustomReason(""); setReportMsg(""); }}
                className="text-xs font-mono text-text-tertiary hover:text-text-primary transition-colors"
              >[ 關閉 ]</button>
            </div>

            <p className="text-xs text-text-secondary mb-5">
              請選擇最符合的檢舉理由，管理團隊將依社群守則進行查核。
            </p>

            <div className="space-y-2 mb-4">
              {[
                { value: "版權侵害", tag: "01", desc: "未經授權轉載他人作品或版權資料" },
                { value: "內容農場/無意義內容", tag: "02", desc: "空泛、抄襲或無實質價值的內容" },
                { value: "其他", tag: "03", desc: "其他不符合學術社群規範之事項" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setReportReason(opt.value); if (opt.value !== "其他") setCustomReason(""); }}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-sm border text-left transition-all ${
                    reportReason === opt.value
                      ? "border-text-primary bg-surface shadow-sm"
                      : "border-border hover:border-text-primary/40 bg-surface-muted"
                  }`}
                >
                  <span className="font-mono text-xs text-text-tertiary">[{opt.tag}]</span>
                  <div>
                    <p className={`text-xs font-bold ${reportReason === opt.value ? "text-text-primary" : "text-text-secondary"}`}>
                      {opt.value}
                    </p>
                    <p className="text-[11px] text-text-tertiary">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* 注意事項 8：「其他」選項的自訂輸入欄位 */}
            {reportReason === "其他" && (
              <div className="mb-4 animate-fade-in">
                <label htmlFor="custom-report-reason" className="block text-xs font-medium text-text-secondary mb-1.5">
                  請說明您的檢舉理由 <span className="text-error">*</span>
                </label>
                <textarea
                  id="custom-report-reason"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  maxLength={200}
                  rows={3}
                  className="w-full px-3 py-2 rounded-sm bg-background border border-border text-text-primary placeholder-text-tertiary focus:outline-none focus:border-text-primary transition-all text-xs resize-none"
                  placeholder="至少 5 個字，例如：此筆記內容與某教授課堂講義完全相同..."
                />
                <div className="flex items-center justify-between mt-1">
                  <p className={`text-[10px] ${customReason.trim().length < 5 ? "text-error" : "text-text-tertiary font-mono"}`}>
                    {customReason.trim().length < 5 ? `還需要 ${5 - customReason.trim().length} 個字` : "字數符合要求"}
                  </p>
                  <p className="text-[10px] font-mono text-text-tertiary">{customReason.length}/200</p>
                </div>
              </div>
            )}

            {reportMsg && (
              <div className={`mb-4 px-3 py-2 rounded-xs text-xs font-mono ${
                reportMsg.startsWith("[ 成功 ]")
                  ? "bg-success/10 text-success border border-success/20"
                  : reportMsg.startsWith("[ 提示 ]")
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    : "bg-error/10 text-error border border-error/20"
              }`}>
                {reportMsg}
              </div>
            )}

            <button
              onClick={submitReport}
              disabled={reportSubmitting || !reportReason || (reportReason === "其他" && customReason.trim().length < 5)}
              className="w-full py-2.5 rounded-sm text-xs font-bold text-white bg-primary hover:bg-primary-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reportSubmitting ? "送出處理中..." : "確認送出檢舉"}
            </button>
          </div>
        </div>
      )}

      {/* ============ 強制打賞 Modal ============ */}
      {showTipModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface w-full max-w-md rounded-md shadow-2xl border border-border p-8 text-center animate-slide-up relative overflow-hidden">
            <div className="font-mono text-xs text-text-tertiary mb-3">[ APPRECIATION // 同儕知識打賞 ]</div>
            
            <h2 className="text-xl font-bold text-text-primary mb-2">感謝您的閱讀！</h2>
            <p className="text-xs text-text-secondary mb-6 leading-relaxed">
              為了支持作者持續整理優質講義，退出前請選擇回饋 1~5 點積分給 <span className="text-text-primary font-bold">{post.author.name}</span>。
            </p>

            <div className="flex justify-center gap-2 mb-8">
              {[1, 2, 3, 4, 5].map((pts) => (
                <button
                  key={pts}
                  onClick={() => setTipAmount(pts)}
                  className={`w-12 h-12 rounded-xl text-lg font-bold transition-all ${
                    tipAmount === pts
                      ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110"
                      : "bg-background border border-border text-text-secondary hover:border-primary/50"
                  }`}
                >
                  {pts}
                </button>
              ))}
            </div>

            {error && (
              <p className="text-sm text-error mb-4">{error}</p>
            )}

            <button
              onClick={submitTipAndExit}
              disabled={submitting}
              className="w-full py-4 rounded-xl text-sm font-bold text-white bg-text-primary hover:bg-black transition-all shadow-xl disabled:opacity-50"
            >
              {submitting ? "處理中..." : `打賞 ${tipAmount} 點並退出`}
            </button>
            <p className="text-xs text-text-tertiary mt-4">您無法略過此步驟。感謝支持知識共享！</p>
          </div>
        </div>
      )}
    </>
  );
}
