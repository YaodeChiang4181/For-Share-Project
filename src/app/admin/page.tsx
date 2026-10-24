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

interface KeywordData {
  keyword: string;
  count: number;
}

interface CategoryDwell {
  category: string;
  avgDuration: number;
  viewCount: number;
}

interface AnalyticsData {
  days: number;
  overview: OverviewData;
  topKeywords: KeywordData[];
  categoryDwell: CategoryDwell[];
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

        {/* ================ Tab 2: 數據儀表板 ================ */}
        {activeTab === "analytics" && (
          <div className="space-y-8">
            {/* 注意事項 5：時間範圍選擇器 */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text-secondary">數據範圍：</span>
              {[5, 10, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setAnalyticsDays(d)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    analyticsDays === d
                      ? "bg-primary text-white shadow-md shadow-primary/25"
                      : "bg-surface border border-border text-text-secondary hover:border-primary/30"
                  }`}
                >
                  {d} 天
                </button>
              ))}
            </div>

            {analyticsLoading || !analytics ? (
              <div className="bg-surface border border-border rounded-2xl p-12 text-center">
                <p className="text-text-tertiary animate-pulse">載入數據中...</p>
              </div>
            ) : (
              <>
                {/* 平台概覽 */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { label: "總用戶數", value: analytics.overview.totalUsers, code: "USERS" },
                    { label: "活躍貼文", value: analytics.overview.totalPosts, code: "POSTS" },
                    { label: "搜尋次數", value: analytics.overview.totalSearches, code: "SEARCH" },
                    { label: "觀看次數", value: analytics.overview.totalPageViews, code: "VIEWS" },
                    { label: "待處理檢舉", value: analytics.overview.pendingReports, code: "REPORTS" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-surface border border-border rounded-md p-5 text-center">
                      <div className="font-mono text-[10px] text-text-tertiary mb-2 font-bold tracking-wider">[ {stat.code} ]</div>
                      <p className="text-2xl font-extrabold text-text-primary font-mono">{stat.value}</p>
                      <p className="text-xs font-medium text-text-secondary mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* 注意事項 7：熱門搜尋排行（長條圖，展示區 60-80%，點擊展開至 80% 螢幕寬度）*/}
                <div
                  className={`bg-surface border border-border rounded-md p-6 transition-all duration-300 cursor-pointer ${
                    expandedChart === "search"
                      ? "fixed inset-x-[10%] top-24 bottom-12 z-50 overflow-y-auto shadow-2xl"
                      : "mx-auto"
                  }`}
                  style={expandedChart !== "search" ? { width: "min(80%, 100%)" } : undefined}
                  onClick={() => setExpandedChart(expandedChart === "search" ? null : "search")}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-bold text-text-primary font-mono">[ TOP 10 ] 熱門搜尋關鍵字</h3>
                    <span className="text-xs font-mono text-text-tertiary">
                      {expandedChart === "search" ? "[ 點擊縮小 ]" : "[ 點擊展開 ]"}
                    </span>
                  </div>
                  {analytics.topKeywords.length === 0 ? (
                    <p className="text-xs font-mono text-text-tertiary text-center py-8">[ 目前沒有搜尋紀錄 ]</p>
                  ) : (
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                      {analytics.topKeywords.map((kw, i) => {
                        const maxCount = analytics.topKeywords[0]?.count || 1;
                        const pct = Math.max(Math.round((kw.count / maxCount) * 100), 5);
                        return (
                          <div key={kw.keyword} className="flex items-center gap-3">
                            <span className="text-xs font-bold font-mono text-text-tertiary w-5 text-right">{i + 1}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-text-primary">{kw.keyword}</span>
                                <span className="text-xs font-mono text-text-tertiary">{kw.count} 次</span>
                              </div>
                              <div className="h-2 bg-background rounded-xs overflow-hidden border border-border">
                                <div
                                  className="h-full bg-primary transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 背景遮罩 */}
                {expandedChart && (
                  <div
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={() => setExpandedChart(null)}
                  />
                )}

                {/* 各科系平均停留時間 */}
                <div
                  className={`bg-surface border border-border rounded-md p-6 transition-all duration-300 cursor-pointer ${
                    expandedChart === "dwell"
                      ? "fixed inset-x-[10%] top-24 bottom-12 z-50 overflow-y-auto shadow-2xl"
                      : "mx-auto"
                  }`}
                  style={expandedChart !== "dwell" ? { width: "min(80%, 100%)" } : undefined}
                  onClick={() => setExpandedChart(expandedChart === "dwell" ? null : "dwell")}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-bold text-text-primary font-mono">[ DWELL TIME ] 各類別平均觀看時間</h3>
                    <span className="text-xs font-mono text-text-tertiary">
                      {expandedChart === "dwell" ? "[ 點擊縮小 ]" : "[ 點擊展開 ]"}
                    </span>
                  </div>
                  {analytics.categoryDwell.length === 0 ? (
                    <p className="text-sm text-text-tertiary text-center py-8">目前沒有觀看紀錄</p>
                  ) : (
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                      {analytics.categoryDwell.map((cat, i) => {
                        const maxDuration = analytics.categoryDwell[0]?.avgDuration || 1;
                        const pct = Math.max(Math.round((cat.avgDuration / maxDuration) * 100), 5);
                        return (
                          <div key={cat.category} className="flex items-center gap-3">
                            <span className="text-xs font-bold text-text-tertiary w-5 text-right">{i + 1}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-bold text-text-primary">{cat.category}</span>
                                <span className="text-xs font-medium text-text-tertiary">
                                  平均 {cat.avgDuration} 秒 ・ {cat.viewCount} 次觀看
                                </span>
                              </div>
                              <div className="h-3 bg-background rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-success to-emerald-400 transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
