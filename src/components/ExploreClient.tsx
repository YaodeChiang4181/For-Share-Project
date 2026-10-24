"use client";

import { useState } from "react";
import Link from "next/link";
import ExploreSearchBar from "@/components/ExploreSearchBar";

interface PostData {
  id: string;
  title: string;
  content: string;
  isPaid: boolean;
  category: string;
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
  const [filteredPosts, setFilteredPosts] = useState<PostData[]>(posts);
  const [searchActive, setSearchActive] = useState(false);

  const handleSearch = (keyword: string) => {
    setSearchActive(true);
    const lower = keyword.toLowerCase();
    const results = posts.filter(
      (p) =>
        p.title.toLowerCase().includes(lower) ||
        p.content.toLowerCase().includes(lower) ||
        p.category.toLowerCase().includes(lower)
    );
    setFilteredPosts(results);
  };

  const displayPosts = searchActive ? filteredPosts : posts;

  return (
    <>
      <ExploreSearchBar onSearch={handleSearch} />

      {searchActive && (
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            找到 <span className="font-bold text-primary">{filteredPosts.length}</span> 筆相關筆記
          </p>
          <button
            onClick={() => { setSearchActive(false); setFilteredPosts(posts); }}
            className="text-xs font-mono text-text-tertiary hover:text-text-primary transition-colors"
          >
            [ 清除檢索條件 ]
          </button>
        </div>
      )}

      {displayPosts.length === 0 ? (
        <div className="paper-card p-12 text-center bg-surface">
          <div className="text-xs font-mono text-text-tertiary mb-3">
            [ {searchActive ? "NO MATCHING NOTES" : "NO ARCHIVED NOTES"} ]
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">
            {searchActive ? "找不到相符之筆記" : "目前尚無公開分享的筆記"}
          </h3>
          <p className="text-xs text-text-secondary mb-6">
            {searchActive ? "請嘗試更換關鍵字進行檢索。" : "成為第一位整理筆記並累積同儕積分的同學！"}
          </p>
          {!searchActive && (
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
          {displayPosts.map((post) => (
            <Link
              href={`/explore/${post.id}`}
              key={post.id}
              className="paper-card bg-surface overflow-hidden group flex flex-col hover:border-text-primary transition-colors"
            >
              <div className="h-32 bg-surface-muted border-b border-border relative p-5 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className={`px-2 py-0.5 rounded-xs text-[10px] font-mono font-medium border ${
                    post.isPaid ? "bg-surface border-border text-text-primary" : "bg-surface border-border text-text-secondary"
                  }`}>
                    {post.isPaid ? "[ 有償分享 ]" : "[ 開放共享 ]"}
                  </span>
                </div>
                <h3 className="text-base font-bold text-text-primary line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                  {cleanNoteText(post.title)}
                </h3>
              </div>
              
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <p className="text-xs text-text-secondary line-clamp-3 leading-relaxed">
                  {cleanNoteText(post.content) || "這份筆記沒有提供詳細說明。"}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
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
