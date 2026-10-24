"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";

interface ExploreSearchBarProps {
  onSearch: (keyword: string) => void;
}

export default function ExploreSearchBar({ onSearch }: ExploreSearchBarProps) {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    // 注意事項 4：未登入不開放搜尋
    if (!session?.user) {
      setNotice("[ 提示 ] 請先登入才能使用搜尋功能");
      return;
    }

    const trimmed = query.trim();

    // 注意事項 3：少於 2 字元
    if (trimmed.length < 2) {
      setNotice("[ 提示 ] 搜尋字詞至少需要 2 個字元");
      return;
    }

    // 注意事項 3：純特殊符號
    const hasValidChar = /[\u4e00-\u9fff\u3400-\u4dbfa-zA-Z0-9]/.test(trimmed);
    if (!hasValidChar) {
      setNotice("[ 提示 ] 搜尋字詞不能為純特殊符號");
      return;
    }

    setNotice("");

    // 注意事項 2：按 Enter 才發送搜尋紀錄
    fetch("/api/analytics/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: trimmed }),
    }).catch(console.error);

    // 觸發父層的搜尋過濾
    onSearch(trimmed);
  };

  const handleFocus = () => {
    setIsFocused(true);
    // 注意事項 3：展開搜尋框時顯示 notice
    if (!session?.user) {
      setNotice("[ 提示 ] 請先登入才能使用搜尋功能");
    } else {
      setNotice("[ 檢索說明 ] 輸入至少 2 個中英文字元，按 Enter 搜尋。不接受純特殊符號。");
    }
  };

  const handleBlur = () => {
    // 延遲隱藏，避免 notice 來不及被看到
    setTimeout(() => {
      setIsFocused(false);
      if (!query.trim()) setNotice("");
    }, 200);
  };

  return (
    <div className="relative mb-8">
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          ref={inputRef}
          id="explore-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={!session?.user}
          className="w-full pl-11 pr-4 py-3.5 rounded-sm bg-surface border border-border text-text-primary placeholder-text-tertiary focus:outline-none focus:border-text-primary transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder={session?.user ? "搜尋筆記標題或關鍵字... (按 Enter 搜尋)" : "請先登入才能搜尋"}
        />
      </div>

      {/* Notice 提示區 */}
      {(isFocused || notice) && notice && (
        <div className={`mt-2 px-3 py-2 rounded-xs text-xs font-mono transition-all animate-fade-in ${
          notice.startsWith("[ 提示 ]")
            ? "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400"
            : "bg-surface border border-border text-text-secondary"
        }`}>
          {notice}
        </div>
      )}
    </div>
  );
}
