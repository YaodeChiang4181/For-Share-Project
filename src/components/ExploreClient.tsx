"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import ExploreSearchBar from "@/components/ExploreSearchBar";
import { safeParseAiTags } from "@/lib/tagSanitizer";
import { extractCardSnippet } from "./NoteContentRenderer";

interface PostData {
  id: string;
  title: string;
  content: string;
  isPaid: boolean;
  category: string;
  department?: string | null;
  academicYear?: string | null;
  noteType?: string | null;
  aiTags?: string | null;
  createdAt: string;
  author: { name: string | null; image: string | null };
}

function cleanNoteText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/[\u{10000}-\u{10ffff}\u2600-\u27bf\u2300-\u23ff\u2b50-\u2b55\u203c-\u2049]/gu, "")
    .replace(/\*\*AI 摘要懶人包\*\*/g, "[ 內容摘要 ]")
    .trim();
}

export default function ExploreClient({ posts }: { posts: PostData[] }) {
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");

  // 動態彙整現有筆記中的系所清單
  const availableDepts = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => {
      if (p.department && p.department.trim()) {
        set.add(p.department.trim());
      }
    });
    return Array.from(set).sort();
  }, [posts]);

  // 動態彙整現有筆記中的學年度清單
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => {
      if (p.academicYear && p.academicYear.trim()) {
        set.add(p.academicYear.trim());
      }
    });
    return Array.from(set).sort().reverse();
  }, [posts]);

  // 筆記類型選項
  const availableTypes = useMemo(() => {
    const defaultTypes = ["考試整理", "上課筆記", "考古題", "重點摘要", "專題/作業", "其他"];
    const set = new Set<string>(defaultTypes);
    posts.forEach((p) => {
      if (p.noteType && p.noteType.trim()) {
        set.add(p.noteType.trim());
      }
    });
    return Array.from(set);
  }, [posts]);

  // 綜合過濾（關鍵字 + 三大篩選）
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      // 1. 結構化篩選
      if (selectedDept && p.department !== selectedDept) return false;
      if (selectedYear && p.academicYear !== selectedYear) return false;
      if (selectedType && p.noteType !== selectedType) return false;

      // 2. 關鍵字比對 (若無搜尋關鍵詞則通過)
      if (!searchKeyword.trim()) return true;

      const lower = searchKeyword.toLowerCase();
      const inTitle = p.title.toLowerCase().includes(lower);
      const inContent = p.content.toLowerCase().includes(lower);
      const inCategory = p.category ? p.category.toLowerCase().includes(lower) : false;
      const inDept = p.department ? p.department.toLowerCase().includes(lower) : false;
      const inYear = p.academicYear ? p.academicYear.toLowerCase().includes(lower) : false;
      const inType = p.noteType ? p.noteType.toLowerCase().includes(lower) : false;
      const inAiTags = p.aiTags ? p.aiTags.toLowerCase().includes(lower) : false;

      return inTitle || inContent || inCategory || inDept || inYear || inType || inAiTags;
    });
  }, [posts, selectedDept, selectedYear, selectedType, searchKeyword]);

  const hasActiveFilters = Boolean(
    searchKeyword.trim() || selectedDept || selectedYear || selectedType
  );

  const handleResetFilters = () => {
    setSearchKeyword("");
    setSelectedDept("");
    setSelectedYear("");
    setSelectedType("");
  };

  return (
    <>
      {/* 關鍵字搜尋框 */}
      <ExploreSearchBar onSearch={(kw) => setSearchKeyword(kw)} />

      {/* ─── 條件篩選工具列 (Filter Bar) ─── */}
      <div className="mb-6 flex flex-wrap items-center gap-2.5 py-3 px-3.5 bg-surface border border-border rounded-sm text-xs font-mono">
        <span className="text-text-tertiary font-bold">[ 快速篩選 ]</span>

        {/* 系所篩選 */}
        <div className="flex items-center gap-1">
          <label htmlFor="filter-dept" className="text-[11px] text-text-tertiary">系所:</label>
          <select
            id="filter-dept"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-2 py-1 bg-surface-muted border border-border rounded-xs text-text-primary focus:outline-none focus:border-text-primary text-[11px] font-mono cursor-pointer"
          >
            <option value="">全部系所</option>
            {availableDepts.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* 學年篩選 */}
        <div className="flex items-center gap-1">
          <label htmlFor="filter-year" className="text-[11px] text-text-tertiary">學年:</label>
          <select
            id="filter-year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-2 py-1 bg-surface-muted border border-border rounded-xs text-text-primary focus:outline-none focus:border-text-primary text-[11px] font-mono cursor-pointer"
          >
            <option value="">全部學年</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>{year} 學年</option>
            ))}
          </select>
        </div>

        {/* 類型篩選 */}
        <div className="flex items-center gap-1">
          <label htmlFor="filter-type" className="text-[11px] text-text-tertiary">類型:</label>
          <select
            id="filter-type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2 py-1 bg-surface-muted border border-border rounded-xs text-text-primary focus:outline-none focus:border-text-primary text-[11px] font-mono cursor-pointer"
          >
            <option value="">全部類型</option>
            {availableTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* 重設條件按鈕 */}
        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className="ml-auto text-[11px] font-mono text-text-tertiary hover:text-text-primary transition-colors underline cursor-pointer"
          >
            [ 重設檢索條件 ]
          </button>
        )}
      </div>

      {/* 篩選與搜尋命中狀態列 */}
      {hasActiveFilters && (
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs font-mono text-text-secondary">
            符合條件筆記共 <span className="font-bold text-primary">{filteredPosts.length}</span> 篇
            {searchKeyword && (
              <span className="ml-2 text-text-tertiary">
                (關鍵字: 「{searchKeyword}」)
              </span>
            )}
          </p>
        </div>
      )}

      {/* 筆記卡片網格 */}
      {filteredPosts.length === 0 ? (
        <div className="paper-card p-12 text-center bg-surface">
          <div className="text-xs font-mono text-text-tertiary mb-3">
            [ {hasActiveFilters ? "NO MATCHING NOTES" : "NO ARCHIVED NOTES"} ]
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">
            {hasActiveFilters ? "找不到相符之筆記" : "目前尚無公開分享的筆記"}
          </h3>
          <p className="text-xs text-text-secondary mb-6">
            {hasActiveFilters ? "請嘗試更換關鍵字或放寬篩選條件。" : "成為第一位整理筆記並累積同儕積分的同學！"}
          </p>
          {!hasActiveFilters && (
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-xs font-semibold text-white bg-primary hover:bg-primary-light transition-colors"
            >
              立刻上傳筆記 →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPosts.map((post) => (
            <Link
              href={`/explore/${post.id}`}
              key={post.id}
              className="paper-card bg-surface overflow-hidden group flex flex-col hover:border-text-primary transition-colors"
            >
              {/* 卡片頂部標籤與標題區 (統一尺寸與高度) */}
              <div className="h-36 bg-surface-muted border-b border-border relative p-4 flex flex-col justify-between">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-xs text-[10px] font-mono font-medium border ${
                    post.isPaid ? "bg-surface border-border text-text-primary" : "bg-surface border-border text-text-secondary"
                  }`}>
                    {post.isPaid ? "[ 有償分享 ]" : "[ 開放共享 ]"}
                  </span>

                  {/* 結構化標籤：系所 */}
                  {post.department && (
                    <span
                      title={`系所：${post.department}`}
                      className="px-1.5 py-0.5 rounded-xs text-[10px] font-mono bg-surface border border-border text-text-secondary max-w-[85px] truncate"
                    >
                      {post.department}
                    </span>
                  )}

                  {/* 結構化標籤：學年度 */}
                  {post.academicYear && (
                    <span
                      title={`學年度：${post.academicYear}`}
                      className="px-1.5 py-0.5 rounded-xs text-[10px] font-mono bg-surface border border-border text-text-secondary max-w-[65px] truncate"
                    >
                      {post.academicYear}
                    </span>
                  )}

                  {/* 結構化標籤：類型（螢光筆劃記美學） */}
                  {post.noteType && (
                    <span
                      title={`類型：${post.noteType}`}
                      className="px-1.5 py-0.5 rounded-xs text-[10px] font-mono bg-accent-highlight/40 border border-[#e2d593] text-text-primary max-w-[80px] truncate"
                    >
                      {post.noteType}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-text-primary line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                  {cleanNoteText(post.title)}
                </h3>

                {/* AI 語意標籤 — 隱藏於 DOM 中供無障礙與搜尋輔助，採用安全防爆解析與純文字連結 */}
                {post.aiTags && (
                  <span className="sr-only" aria-hidden="true" data-ai-tags="safe">
                    {safeParseAiTags(post.aiTags).join(" ")}
                  </span>
                )}
              </div>
              
              <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                <p className="text-xs text-text-secondary line-clamp-3 leading-relaxed">
                  {extractCardSnippet(post.content)}
                </p>
                
                <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-xs bg-surface-muted border border-border flex items-center justify-center font-mono text-[9px] font-bold text-text-primary">
                      {post.author.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <span className="text-xs font-mono text-text-secondary truncate max-w-[100px]">
                      {post.author.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-text-tertiary">
                    {new Date(post.createdAt).toLocaleDateString("zh-TW")}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

