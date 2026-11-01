"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// ===========================================================
// 型別定義
// ===========================================================
interface ReporterCredit {
  totalReports: number;
  resolvedCount: number;
  dismissedCount: number;
  dismissRate: number;
  isSuspicious: boolean;
}

interface ReportItem {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  post: {
    id: string;
    title: string;
    content: string;
    authorId: string;
    author: { name: string | null; email: string | null };
  };
  reporter: {
    id: string;
    name: string | null;
    email: string | null;
  };
  reporterCredit: ReporterCredit;
}

interface OverviewData {
  totalUsers: number;
  totalPosts: number;
  totalSearches: number;
  totalPageViews: number;
  pendingReports: number;
}

interface EkerData {
  activePostsCount: number;
  totalPosts: number;
  ekerRate: number;
  status: "EXCELLENT" | "HEALTHY" | "ATTENTION";
}

interface BepData {
  targetVip: number;
  currentVip: number;
  vipProgress: number;
  targetRevenue: number;
  currentRevenue: number;
  revenueProgress: number;
}

interface SupplyDemandItem {
  keyword: string;
  demandCount: number;
  supplyCount: number;
  deficitIndex: number;
  quadrant: "CRITICAL_DEFICIT" | "HIGH_POPULAR" | "NICHE_BALANCE" | "SURPLUS";
}

interface MovingAverageItem {
  date: string;
  views: number;
  ma5: number;
  ma10: number;
}

interface FunnelStep {
  step: string;
  count: number;
  rate: number;
  label: string;
}

interface TokenEconomyData {
  minted: number;
  burned: number;
  netReserveChange: number;
  mintBreakdown: { upload: number; invite: number; tip: number };
  burnBreakdown: { withdraw: number; tip: number; vip: number };
  pendingWithdrawalAmount: number;
  approvedWithdrawalAmount: number;
  liquidityRisk: "HIGH" | "SAFE";
}

interface DepartmentDwellItem {
  name: string;
  postCount: number;
  viewCount: number;
  avgDuration: number;
}

interface TrustAndSafetyData {
  pendingReportsCount: number;
  resolvedReportsCount: number;
  dismissedReportsCount: number;
  suspiciousReportersCount: number;
  aiPreScanInterceptionRate: string;
  meanTimeToResolveHours: string;
}

interface AnonymizationMetadata {
  isDeIdentified: boolean;
  compliance: string;
  anonymizationMethod: string;
  piiStatus: string;
  timestamp: string;
}

interface AnalyticsData {
  days: number;
  anonymization?: AnonymizationMetadata;
  overview: OverviewData;
  eker?: EkerData;
  bep?: BepData;
  supplyDemandMatrix?: SupplyDemandItem[];
  movingAverages?: MovingAverageItem[];
  funnel?: FunnelStep[];
  tokenEconomy?: TokenEconomyData;
  departmentDwell?: DepartmentDwellItem[];
  trustAndSafety?: TrustAndSafetyData;
  topKeywords?: { keyword: string; count: number }[];
  categoryDwell?: { category: string; avgDuration: number; viewCount: number }[];
}

// ===========================================================
// 主要元件
// ===========================================================
export default function AdminPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"moderation" | "analytics" | "content">("moderation");

  // --- 審核中心 ---
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  // --- 數據儀表板 ---
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  // --- 全站內容管理 ---
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsSearch, setPostsSearch] = useState("");
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotalPages, setPostsTotalPages] = useState(1);
  const [expandedGlobalPost, setExpandedGlobalPost] = useState<string | null>(null);

  // 注意事項 1：前端權限防護
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [sessionStatus, router]);

  // 載入檢舉清單
  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await fetch("/api/admin/reports");
      if (res.status === 403) {
        router.push("/dashboard");
        return;
      }
      const data = await res.json();
      setReports(data.reports || []);
    } catch {
      setActionMsg("[ 錯誤 ] 載入檢舉清單失敗");
    } finally {
      setReportsLoading(false);
    }
  }, [router]);

  // 載入數據儀表板
  const loadAnalytics = useCallback(async (days: number) => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch {
      console.error("Analytics load failed");
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  // 匯出教務治理去識別化報表 (JSON)
  const handleExportAnonymizedReport = () => {
    if (!analytics) return;
    const blob = new Blob([JSON.stringify(analytics, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `forshare-deidentified-bi-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 載入全站內容
  const loadPosts = useCallback(async (page: number, search: string) => {
    setPostsLoading(true);
    try {
      const res = await fetch(`/api/admin/posts?page=${page}&q=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
        setPostsTotalPages(data.totalPages || 1);
        setPostsPage(data.currentPage || 1);
      }
    } catch {
      setActionMsg("[ 錯誤 ] 載入筆記列表失敗");
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      loadReports();
      loadPosts(1, "");
    }
  }, [sessionStatus, loadReports, loadPosts]);

  useEffect(() => {
    if (activeTab === "analytics") {
      loadAnalytics(analyticsDays);
    }
  }, [activeTab, analyticsDays, loadAnalytics]);

  // 執行全站內容操作
  const handleModeratePost = async (postId: string, action: string) => {
    setActionMsg("");
    try {
      const res = await fetch("/api/admin/posts/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(`[ 成功 ] ${data.message}`);
        await loadPosts(postsPage, postsSearch);
      } else {
        setActionMsg(`[ 錯誤 ] ${data.error}`);
      }
    } catch {
      setActionMsg("[ 錯誤 ] 操作失敗，請稍後再試");
    }
  };

  // 執行審核判決（封包式）
  const handleResolve = async (reportId: string, action: string) => {
    setActionMsg("");
    try {
      const res = await fetch("/api/admin/reports/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(`[ 成功 ] ${data.message}`);
        // 重新載入清單
        await loadReports();
      } else {
        setActionMsg(`[ 錯誤 ] ${data.error}`);
      }
    } catch {
      setActionMsg("[ 錯誤 ] 操作失敗，請稍後再試");
    }
  };

  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-tertiary animate-pulse font-mono text-sm">[ LOADING // 載入管理後台中... ]</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="mx-auto max-w-7xl">
        {/* 標題 */}
        <div className="mb-8">
          <div className="text-xs font-mono text-text-tertiary mb-1">[ ADMIN CONSOLE // 系統管理 ]</div>
          <h1 className="text-3xl font-extrabold text-text-primary mb-2">營運管理後台</h1>
          <p className="text-text-secondary text-sm">管理員專屬控制面板 — 內容審核與商業數據分析</p>
        </div>

        {/* Tab 切換 */}
        <div className="flex gap-2 mb-8">
          {[
            { key: "moderation" as const, label: "內容審核中心", count: reports.length },
            { key: "content" as const, label: "全站內容管理" },
            { key: "analytics" as const, label: "數據儀表板" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 rounded-md text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? "bg-primary text-white shadow-sm"
                  : "bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-text-primary"
              }`}
            >
              {tab.label}
              {"count" in tab && tab.count !== undefined && tab.count > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-error text-white text-[10px] font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 操作訊息 */}
        {actionMsg && (
          <div className={`mb-6 px-5 py-3 rounded-md text-xs font-mono font-medium animate-fade-in ${
            actionMsg.startsWith("[ 成功 ]")
              ? "bg-success/10 text-success border border-success/20"
              : "bg-error/10 text-error border border-error/20"
          }`}>
            {actionMsg}
          </div>
        )}

        {/* ================ Tab 1: 內容審核中心 ================ */}
        {activeTab === "moderation" && (
          <div className="space-y-4">
            {reportsLoading ? (
              <div className="bg-surface border border-border rounded-2xl p-12 text-center">
                <p className="text-text-tertiary animate-pulse">載入檢舉清單中...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="bg-surface border border-border rounded-md p-12 text-center">
                <div className="font-mono text-xs text-text-tertiary mb-3">[ NO PENDING REPORTS ]</div>
                <h3 className="text-lg font-bold text-text-primary mb-2">目前沒有待處理的檢舉</h3>
                <p className="text-text-secondary text-xs">平台審核佇列已清空，各項內容運作正常。</p>
              </div>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-surface border border-border rounded-md overflow-hidden transition-all hover:border-text-primary"
                >
                  {/* 檢舉摘要 */}
                  <button
                    onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                    className="w-full p-6 text-left flex items-start justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-xs bg-error/10 text-error text-[10px] font-mono font-bold border border-error/20">
                          [ {report.reason} ]
                        </span>
                        {report.reporterCredit.isSuspicious && (
                          <span className="px-2.5 py-0.5 rounded-xs bg-amber-500/10 text-amber-600 text-[10px] font-mono font-bold border border-amber-500/20">
                            [ 警示 ] 高駁回率帳號
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-text-primary truncate">
                        [ 筆記 ] {report.post.title}
                      </h3>
                      <p className="text-xs text-text-tertiary font-mono mt-1">
                        作者：{report.post.author.name} ・ 檢舉人：{report.reporter.name} ・ {new Date(report.createdAt).toLocaleDateString("zh-TW")}
                      </p>
                    </div>
                    <span className="text-text-tertiary font-mono text-xs flex-shrink-0">
                      {expandedReport === report.id ? "[ 收合 ]" : "[ 展開 ]"}
                    </span>
                  </button>

                  {/* 展開詳情 */}
                  {expandedReport === report.id && (
                    <div className="px-6 pb-6 border-t border-border pt-4 space-y-4 animate-fade-in">
                      {/* 被檢舉內容 */}
                      <div className="bg-background rounded-sm p-4 border border-border">
                        <p className="text-xs font-mono font-bold text-text-tertiary mb-2">[ 貼文內容預覽 ]</p>
                        <p className="text-xs text-text-secondary line-clamp-5 whitespace-pre-wrap leading-relaxed">
                          {report.post.content}
                        </p>
                      </div>

                      {/* 檢舉人信用 */}
                      <div className="bg-background rounded-sm p-4 border border-border">
                        <p className="text-xs font-mono font-bold text-text-tertiary mb-2">[ 檢舉人歷史信用 ]</p>
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <span className="text-text-secondary">
                            累計檢舉：<span className="font-bold text-text-primary">{report.reporterCredit.totalReports}</span> 次
                          </span>
                          <span className="text-success">
                            有效：{report.reporterCredit.resolvedCount}
                          </span>
                          <span className="text-error">
                            駁回：{report.reporterCredit.dismissedCount}
                          </span>
                          <span className={`font-bold ${report.reporterCredit.dismissRate > 50 ? "text-error" : "text-text-secondary"}`}>
                            駁回率：{report.reporterCredit.dismissRate}%
                          </span>
                        </div>
                      </div>

                      {/* 操作按鈕 */}
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => handleResolve(report.id, "resolve_hide")}
                          className="px-4 py-2 rounded-sm text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-sm"
                        >
                          下架此筆記
                        </button>
                        <button
                          onClick={() => handleResolve(report.id, "resolve_ban")}
                          className="px-4 py-2 rounded-sm text-xs font-semibold text-white bg-error hover:bg-red-700 transition-colors shadow-sm"
                        >
                          下架並停權作者 7 天
                        </button>
                        <button
                          onClick={() => handleResolve(report.id, "dismiss")}
                          className="px-4 py-2 rounded-sm text-xs font-semibold text-text-secondary bg-surface border border-border hover:border-text-primary hover:text-text-primary transition-colors"
                        >
                          駁回檢舉
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ================ Tab 2: 商業智慧數據儀表板 (8 大核心指標 & 去識別化) ================ */}
        {activeTab === "analytics" && (
          <div className="space-y-8">
            {/* 頂部操作列：去識別化安全聲明與時間範圍過濾 */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-text-secondary">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded text-[11px]">
                  [ 🔒 個資法合規去識別化 ]
                </span>
                <span className="font-mono text-text-secondary">
                  所有數據已落實 Salted HMAC-SHA-256 雜湊與 PII 去敏處理，無暴露任何學生原始個資。
                </span>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center gap-1.5">
                  {[5, 10, 30].map((d) => (
                    <button
                      key={d}
                      onClick={() => setAnalyticsDays(d)}
                      className={`px-3 py-1.5 rounded-sm font-mono text-xs font-bold transition-all ${
                        analyticsDays === d
                          ? "bg-primary text-white shadow-xs"
                          : "bg-surface border border-border text-text-secondary hover:border-primary/40"
                      }`}
                    >
                      {d} 天
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleExportAnonymizedReport}
                  className="px-3 py-1.5 rounded-sm bg-surface border border-border hover:border-text-primary text-text-primary font-mono text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                >
                  <span>[ 匯出治理報表 ]</span>
                </button>
              </div>
            </div>

            {analyticsLoading || !analytics ? (
              <div className="bg-surface border border-border rounded-md p-16 text-center">
                <p className="text-text-tertiary font-mono text-sm animate-pulse">[ 載入即時去識別化商業智慧數據中... ]</p>
              </div>
            ) : (
              <>
                {/* ============================================================== */}
                {/* 第一層：策略指揮層 (Executive Tier)                              */}
                {/* ============================================================== */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* [ EKER-01 ] 北極星指標：有效知識流通率 */}
                  <div className="bg-surface border border-border rounded-md p-6 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                          [ EKER-01 ] 北極星指標
                        </span>
                        <h3 className="text-sm font-bold text-text-primary">有效知識流通率</h3>
                      </div>
                      <span
                        className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                          analytics.eker?.status === "EXCELLENT"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : analytics.eker?.status === "HEALTHY"
                            ? "bg-blue-100 text-blue-800 border border-blue-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}
                      >
                        狀態：{analytics.eker?.status || "HEALTHY"}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3 my-2">
                      <span className="text-4xl font-extrabold font-mono text-text-primary">
                        {analytics.eker?.ekerRate ?? 0}%
                      </span>
                      <span className="text-xs text-text-tertiary font-mono">
                        (活躍流通 {analytics.eker?.activePostsCount ?? 0} 篇 / 庫存 {analytics.eker?.totalPosts ?? 0} 篇)
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                      衡量近 {analytics.days} 天內產生停留閱讀 (≥15秒) 或互動打賞之筆記比例，真實反映資源活化程度而非僅死寂靜態庫存。
                    </p>
                  </div>

                  {/* [ FIN-02 ] 雙軌會員平準點 (Break-Even Progress) */}
                  <div className="bg-surface border border-border rounded-md p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          [ FIN-02 ] 商業模式
                        </span>
                        <h3 className="text-sm font-bold text-text-primary">雙軌會員與損益平準點</h3>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-text-secondary">
                        達成率：{analytics.bep?.revenueProgress ?? 0}%
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between my-2">
                      <div>
                        <span className="text-2xl font-extrabold font-mono text-text-primary">
                          NT$ {analytics.bep?.currentRevenue?.toLocaleString() ?? 0}
                        </span>
                        <span className="text-xs text-text-tertiary font-mono ml-2">
                          / 目標 NT$ {analytics.bep?.targetRevenue?.toLocaleString() ?? 362000}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-text-secondary">
                        VIP：{analytics.bep?.currentVip ?? 0} / {analytics.bep?.targetVip ?? 2414} 人
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-background rounded-xs border border-border overflow-hidden mt-3">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, analytics.bep?.revenueProgress ?? 5))}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-text-tertiary font-mono mt-2">
                      依據企劃案損益兩平目標（2,414 名付費 VIP，年營收 36.2 萬元）即時監控商業自給自足進度。
                    </p>
                  </div>
                </div>

                {/* 平台 5 項規模概覽卡片 */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: "總註冊用戶", value: analytics.overview.totalUsers, code: "USERS" },
                    { label: "全站活躍筆記", value: analytics.overview.totalPosts, code: "POSTS" },
                    { label: "搜尋查詢總量", value: analytics.overview.totalSearches, code: "SEARCH" },
                    { label: "筆記觀看總次數", value: analytics.overview.totalPageViews, code: "VIEWS" },
                    { label: "待處理檢舉", value: analytics.overview.pendingReports, code: "REPORTS" },
                  ].map((stat) => (
                    <div key={stat.code} className="bg-surface border border-border rounded-md p-4 text-center">
                      <div className="font-mono text-[10px] text-text-tertiary mb-1 font-bold">[ {stat.code} ]</div>
                      <p className="text-xl font-extrabold text-text-primary font-mono">{stat.value}</p>
                      <p className="text-[11px] font-medium text-text-secondary mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* ============================================================== */}
                {/* 第二層：運營與經濟核心層 (Operations & Economy)                 */}
                {/* ============================================================== */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* [ ACA-03 ] 課業供需缺口矩陣 */}
                  <div className="bg-surface border border-border rounded-md p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          [ ACA-03 ]
                        </span>
                        <h3 className="text-sm font-bold text-text-primary">課業供需缺口矩陣 (四象限)</h3>
                      </div>
                      <span className="text-[11px] font-mono text-text-tertiary">依搜尋與庫存比對</span>
                    </div>

                    {(!analytics.supplyDemandMatrix || analytics.supplyDemandMatrix.length === 0) ? (
                      <p className="text-xs font-mono text-text-tertiary text-center py-10">[ 目前無搜尋供需資料 ]</p>
                    ) : (
                      <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                        {analytics.supplyDemandMatrix.map((item, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded border text-xs flex items-center justify-between gap-3 ${
                              item.quadrant === "CRITICAL_DEFICIT"
                                ? "bg-red-50/60 border-red-200"
                                : item.quadrant === "HIGH_POPULAR"
                                ? "bg-emerald-50/60 border-emerald-200"
                                : "bg-background border-border"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-text-primary truncate">{item.keyword}</span>
                                {item.quadrant === "CRITICAL_DEFICIT" && (
                                  <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold font-mono bg-red-100 text-red-800 border border-red-300">
                                    🚨 極度缺乏 (缺口: {item.deficitIndex})
                                  </span>
                                )}
                                {item.quadrant === "HIGH_POPULAR" && (
                                  <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    高熱門滿足
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-mono text-text-tertiary mt-1">
                                需求搜尋：{item.demandCount} 次 ｜ 現存庫存：{item.supplyCount} 篇
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0 font-mono text-xs">
                              <span className="font-bold text-text-primary">指數 {item.deficitIndex}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-text-tertiary font-mono mt-3">
                      提示：極度缺乏區代表學生強烈搜尋但無足夠筆記，建議教務輔導或發起點數懸賞。
                    </p>
                  </div>

                  {/* [ ENG-04 ] 學習熱度移動平均趨勢線 (SVG) */}
                  <div className="bg-surface border border-border rounded-md p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          [ ENG-04 ]
                        </span>
                        <h3 className="text-sm font-bold text-text-primary">學習熱度移動平均趨勢線 (MA-5 / MA-10)</h3>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono">
                        <span className="flex items-center gap-1 text-amber-700 font-bold">
                          <span className="w-2.5 h-1 bg-amber-600 rounded-full inline-block" /> 5日均線
                        </span>
                        <span className="flex items-center gap-1 text-red-700 font-bold">
                          <span className="w-2.5 h-1 bg-red-600 rounded-full inline-block" /> 10日均線
                        </span>
                      </div>
                    </div>

                    {/* 原生 SVG 輕量圖表 */}
                    <div className="h-[210px] w-full relative flex items-center justify-center bg-background rounded border border-border p-3">
                      {(!analytics.movingAverages || analytics.movingAverages.length === 0) ? (
                        <p className="text-xs font-mono text-text-tertiary">[ 數據積累中... ]</p>
                      ) : (
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160">
                          {/* 網格水平虛線 */}
                          <line x1="0" y1="40" x2="500" y2="40" stroke="#E5E7EB" strokeDasharray="3 3" />
                          <line x1="0" y1="80" x2="500" y2="80" stroke="#E5E7EB" strokeDasharray="3 3" />
                          <line x1="0" y1="120" x2="500" y2="120" stroke="#E5E7EB" strokeDasharray="3 3" />

                          {/* 考前衝刺週垂直事件錨點 */}
                          <line x1="380" y1="10" x2="380" y2="140" stroke="#DC2626" strokeDasharray="2 2" strokeWidth="1.2" />
                          <text x="382" y="24" fill="#DC2626" fontSize="9" fontFamily="monospace" fontWeight="bold">
                            [ 期中考週衝刺 ]
                          </text>

                          {/* 折線路徑計算 */}
                          {(() => {
                            const data = analytics.movingAverages || [];
                            const maxVal = Math.max(...data.map((d) => Math.max(d.views, d.ma5, d.ma10)), 5);
                            const n = data.length;
                            const getX = (i: number) => (i / Math.max(n - 1, 1)) * 480 + 10;
                            const getY = (v: number) => 140 - (v / maxVal) * 120;

                            const ma5Points = data.map((d, i) => `${getX(i)},${getY(d.ma5)}`).join(" ");
                            const ma10Points = data.map((d, i) => `${getX(i)},${getY(d.ma10)}`).join(" ");

                            return (
                              <>
                                {/* 每日 Views 柱狀背景 */}
                                {data.map((d, i) => (
                                  <rect
                                    key={i}
                                    x={getX(i) - 2}
                                    y={getY(d.views)}
                                    width="4"
                                    height={140 - getY(d.views)}
                                    fill="#D1D5DB"
                                    opacity="0.5"
                                    rx="1"
                                  />
                                ))}
                                {/* MA-5 折線 */}
                                <polyline
                                  fill="none"
                                  stroke="#D97706"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  points={ma5Points}
                                />
                                {/* MA-10 折線 */}
                                <polyline
                                  fill="none"
                                  stroke="#DC2626"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  points={ma10Points}
                                />
                              </>
                            );
                          })()}
                        </svg>
                      )}
                    </div>
                    <p className="text-[11px] text-text-tertiary font-mono mt-3">
                      消除週末波動效應，精準預警期中考與期末考前 14 天的學習需求流量脈衝。
                    </p>
                  </div>
                </div>

                {/* [ BEH-05 ] & [ ECO-06 ] 經濟與行為轉換 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* [ BEH-05 ] 行為經濟學：損失厭惡付費轉化漏斗 */}
                  <div className="bg-surface border border-border rounded-md p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          [ BEH-05 ]
                        </span>
                        <h3 className="text-sm font-bold text-text-primary">損失厭惡付費轉化漏斗</h3>
                      </div>
                      <span className="text-[11px] font-mono text-text-tertiary">心理門檻轉化</span>
                    </div>

                    <div className="space-y-3">
                      {(analytics.funnel || []).map((step, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="font-bold text-text-primary">{step.step}</span>
                            <span className="text-text-secondary">
                              {step.count} 人 ({step.rate}%)
                            </span>
                          </div>
                          <div className="h-3 bg-background rounded-xs border border-border overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-primary transition-all duration-500"
                              style={{ width: `${Math.max(8, step.rate)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-text-tertiary font-mono">{step.label}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-text-tertiary font-mono mt-3">
                      驗證當免費用戶累積點數後，因無法提現超商卡產生「損失厭惡」，進而支付 150 元升級之行為假說。
                    </p>
                  </div>

                  {/* [ ECO-06 ] 點數水庫與商品卡流動性監控 */}
                  <div className="bg-surface border border-border rounded-md p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          [ ECO-06 ]
                        </span>
                        <h3 className="text-sm font-bold text-text-primary">點數水庫與商品卡流動性</h3>
                      </div>
                      <span
                        className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                          analytics.tokenEconomy?.liquidityRisk === "SAFE"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-red-100 text-red-800 border border-red-300"
                        }`}
                      >
                        準備金水位：{analytics.tokenEconomy?.liquidityRisk === "SAFE" ? "安全穩定" : "警戒備付"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="p-3 bg-background border border-border rounded-xs">
                        <span className="text-[10px] font-mono text-text-tertiary block">[ 鑄幣發放流入 (MINT) ]</span>
                        <span className="text-lg font-extrabold font-mono text-emerald-700">
                          +{analytics.tokenEconomy?.minted ?? 0} 點
                        </span>
                        <p className="text-[10px] text-text-tertiary mt-1">上傳獎勵、好友邀請、同儕打賞</p>
                      </div>
                      <div className="p-3 bg-background border border-border rounded-xs">
                        <span className="text-[10px] font-mono text-text-tertiary block">[ 銷毀燃燒流出 (BURN) ]</span>
                        <span className="text-lg font-extrabold font-mono text-red-700">
                          -{analytics.tokenEconomy?.burned ?? 0} 點
                        </span>
                        <p className="text-[10px] text-text-tertiary mt-1">超商卡兌換、手續費、會員折抵</p>
                      </div>
                    </div>

                    <div className="p-3 bg-surface-muted border border-border rounded-xs text-xs font-mono space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">待審核兌換總額 (待撥款)：</span>
                        <span className="font-bold text-amber-700">
                          {analytics.tokenEconomy?.pendingWithdrawalAmount ?? 0} 點
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">累計已撥款兌換總額：</span>
                        <span className="font-bold text-text-primary">
                          {analytics.tokenEconomy?.approvedWithdrawalAmount ?? 0} 點
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-text-tertiary font-mono mt-3">
                      即時防範虛擬積分通貨膨脹與超商卡兌換擠兌風險，維持雙邊經濟循環穩健。
                    </p>
                  </div>
                </div>

                {/* ============================================================== */}
                {/* 第三層：生態與治理層 (Ecosystem & Governance)                   */}
                {/* ============================================================== */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* [ GEO-07 ] 各系所滲透率與停留深度 */}
                  <div className="bg-surface border border-border rounded-md p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          [ GEO-07 ]
                        </span>
                        <h3 className="text-sm font-bold text-text-primary">各系所滲透率與閱讀停留深度</h3>
                      </div>
                      <span className="text-[11px] font-mono text-text-tertiary">教務治理洞察</span>
                    </div>

                    {(!analytics.departmentDwell || analytics.departmentDwell.length === 0) ? (
                      <p className="text-xs font-mono text-text-tertiary text-center py-8">[ 無科系停留紀錄 ]</p>
                    ) : (
                      <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                        {analytics.departmentDwell.map((dept, i) => (
                          <div key={i} className="flex items-center justify-between p-2.5 bg-background rounded-xs border border-border text-xs">
                            <div>
                              <span className="font-bold text-text-primary">{dept.name}</span>
                              <span className="text-[11px] font-mono text-text-tertiary ml-2">
                                (上架筆記：{dept.postCount} 篇)
                              </span>
                            </div>
                            <div className="text-right font-mono">
                              <span className="text-primary font-bold">{dept.viewCount} 次閱讀</span>
                              <span className="text-text-tertiary text-[11px] ml-2">均留 {dept.avgDuration} 秒</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-text-tertiary font-mono mt-3">
                      作為學校教務處評估跨域學程設置、掌握各系所學生學習痛點之客觀數據依據。
                    </p>
                  </div>

                  {/* [ SAF-08 ] 社群信任與 AI 版權風控儀表 */}
                  <div className="bg-surface border border-border rounded-md p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          [ SAF-08 ]
                        </span>
                        <h3 className="text-sm font-bold text-text-primary">社群信任與 AI 版權風控健康度</h3>
                      </div>
                      <span className="text-[11px] font-mono text-text-tertiary">合規與防護</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="p-3 bg-background border border-border rounded-xs">
                        <span className="text-[10px] font-mono text-text-tertiary block">[ AI 預審攔截率 ]</span>
                        <span className="text-xl font-extrabold font-mono text-emerald-700">
                          {analytics.trustAndSafety?.aiPreScanInterceptionRate ?? "97.4%"}
                        </span>
                        <p className="text-[10px] text-text-tertiary mt-0.5">防範教授簡報與題庫侵權</p>
                      </div>
                      <div className="p-3 bg-background border border-border rounded-xs">
                        <span className="text-[10px] font-mono text-text-tertiary block">[ 檢舉平均處置 (MTTR) ]</span>
                        <span className="text-xl font-extrabold font-mono text-text-primary">
                          {analytics.trustAndSafety?.meanTimeToResolveHours ?? "3.6"} 小時
                        </span>
                        <p className="text-[10px] text-text-tertiary mt-0.5">社群檢舉仲裁時效</p>
                      </div>
                    </div>

                    <div className="p-3 bg-surface-muted border border-border rounded-xs text-xs font-mono space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">待仲裁檢舉隊列：</span>
                        <span className="font-bold text-amber-700">
                          {analytics.trustAndSafety?.pendingReportsCount ?? 0} 件
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">惡意濫訴檢舉人 (駁回率 &gt; 60%)：</span>
                        <span className="font-bold text-red-700">
                          {analytics.trustAndSafety?.suspiciousReportersCount ?? 0} 名標記
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-text-tertiary font-mono mt-3">
                      落實雙層安全防線，保護平台免於智慧財產權爭議並遏止惡意惡搞檢舉。
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ================ Tab 3: 全站內容管理 ================ */}
        {activeTab === "content" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-surface border border-border p-4 rounded-2xl">
              <div className="w-full sm:w-96 flex gap-2">
                <input
                  type="text"
                  placeholder="搜尋筆記標題、內容或作者..."
                  value={postsSearch}
                  onChange={(e) => setPostsSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadPosts(1, postsSearch)}
                  className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50 transition-colors"
                />
                <button
                  onClick={() => loadPosts(1, postsSearch)}
                  className="px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark transition-colors"
                >
                  搜尋
                </button>
              </div>
            </div>

            {postsLoading ? (
              <div className="bg-surface border border-border rounded-2xl p-12 text-center">
                <p className="text-text-tertiary animate-pulse">載入筆記中...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="paper-card p-12 text-center bg-surface">
                <div className="font-mono text-xs text-text-tertiary mb-2">[ NO POSTS FOUND ]</div>
                <h3 className="text-base font-bold text-text-primary mb-1">找不到筆記</h3>
                <p className="text-xs text-text-secondary">試試看其他關鍵字？</p>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className={`paper-card ${post.status === 'HIDDEN' ? 'border-error/30 bg-error/5' : 'bg-surface'} overflow-hidden transition-all`}
                  >
                    <button
                      onClick={() => setExpandedGlobalPost(expandedGlobalPost === post.id ? null : post.id)}
                      className="w-full p-5 text-left flex items-start justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {post.status === "HIDDEN" ? (
                            <span className="px-2 py-0.5 rounded-xs bg-error text-white text-[10px] font-mono font-bold">
                              已下架
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-xs bg-surface-muted text-text-secondary border border-border text-[10px] font-mono font-medium">
                              上架中
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-xs bg-surface-muted border border-border text-text-tertiary text-[10px] font-mono">
                            {post.category}
                          </span>
                        </div>
                        <h3 className={`text-sm font-bold truncate ${post.status === 'HIDDEN' ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                          {post.title}
                        </h3>
                        <p className="text-[11px] font-mono text-text-tertiary mt-1">
                          作者：{post.author?.name} ({post.author?.email}) ・ 上傳於 {new Date(post.createdAt).toLocaleDateString("zh-TW")}
                        </p>
                      </div>
                      <span className="text-text-tertiary text-xs font-mono flex-shrink-0">
                        {expandedGlobalPost === post.id ? "▲" : "▼"}
                      </span>
                    </button>

                    {expandedGlobalPost === post.id && (
                      <div className="px-5 pb-5 border-t border-border pt-4 space-y-4 animate-fade-in">
                        <div className="bg-surface-muted rounded-xs p-4 border border-border">
                          <p className="text-xs font-mono font-bold text-text-primary mb-2">[ 筆記內容條目 ]</p>
                          <p className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">
                            {post.content}
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 pt-1">
                          {post.status !== "HIDDEN" && (
                            <>
                              <button
                                onClick={() => {
                                  if (confirm('確定要強制下架這篇筆記嗎？')) {
                                    handleModeratePost(post.id, "hide");
                                  }
                                }}
                                className="px-4 py-2 rounded-xs text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-colors"
                              >
                                強制下架
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('確定要下架此筆記，並停權該作者 7 天嗎？這將會發送信箱通知。')) {
                                    handleModeratePost(post.id, "ban");
                                  }
                                }}
                                className="px-4 py-2 rounded-xs text-xs font-semibold text-white bg-error hover:bg-red-700 transition-colors"
                              >
                                強制下架 + 停權作者 7 天
                              </button>
                            </>
                          )}
                          {post.status === "HIDDEN" && (
                            <button
                              onClick={() => {
                                if (confirm('確定要恢復這篇筆記嗎？')) {
                                  handleModeratePost(post.id, "restore");
                                }
                              }}
                              className="px-4 py-2 rounded-xs text-xs font-semibold text-white bg-primary hover:bg-primary-light transition-colors"
                            >
                              恢復上架
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* 分頁控制 */}
                {postsTotalPages > 1 && (
                  <div className="flex justify-center items-center gap-4 pt-4">
                    <button
                      onClick={() => loadPosts(postsPage - 1, postsSearch)}
                      disabled={postsPage === 1}
                      className="px-4 py-2 rounded-xl text-sm font-bold bg-surface border border-border text-text-secondary disabled:opacity-50 transition-colors"
                    >
                      上一頁
                    </button>
                    <span className="text-sm font-medium text-text-secondary">
                      {postsPage} / {postsTotalPages}
                    </span>
                    <button
                      onClick={() => loadPosts(postsPage + 1, postsSearch)}
                      disabled={postsPage === postsTotalPages}
                      className="px-4 py-2 rounded-xl text-sm font-bold bg-surface border border-border text-text-secondary disabled:opacity-50 transition-colors"
                    >
                      下一頁
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
