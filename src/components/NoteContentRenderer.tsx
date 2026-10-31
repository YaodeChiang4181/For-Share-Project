"use client";

import React, { useState, useMemo } from "react";

interface NoteContentRendererProps {
  content: string | null | undefined;
  title?: string;
}

/**
 * 格式化行內語法：粗體 (**text**)、LaTeX/數學公式 ($...$)、行內代碼 (`...`)
 */
function renderInlineFormatting(text: string): React.ReactNode[] {
  if (!text) return [];

  // 先依照公式 $...$ 切分
  const formulaRegex = /\$([^\$]+)\$/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = formulaRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...parseBoldAndCode(text.substring(lastIndex, match.index), `txt-${lastIndex}`));
    }
    const formula = match[1];
    parts.push(
      <code
        key={`formula-${match.index}`}
        className="font-mono text-[11px] md:text-xs bg-black/5 dark:bg-white/10 text-text-primary px-1.5 py-0.5 rounded-xs mx-0.5 border border-border-light font-medium tracking-tight inline-block select-all"
        title="數學公式 / 參數"
      >
        {formula}
      </code>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(...parseBoldAndCode(text.substring(lastIndex), `txt-${lastIndex}`));
  }

  return parts;
}

/**
 * 輔助解析 **粗體** 與 `代碼`
 */
function parseBoldAndCode(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // 匹配 **bold** 或 `code`
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    if (match[2]) {
      // **粗體**
      parts.push(
        <strong key={`${keyPrefix}-b-${match.index}`} className="font-bold text-text-primary">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // `代碼`
      parts.push(
        <code
          key={`${keyPrefix}-c-${match.index}`}
          className="font-mono text-xs bg-surface-muted px-1 py-0.5 rounded-xs text-text-primary"
        >
          {match[3]}
        </code>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

/**
 * 清洗字串中的殘留 HTML 標籤並轉譯為純淨文字/Markdown
 */
function sanitizeRawText(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, "\n### $1\n")
    .replace(/<\/?h[1-6][^>]*>/gi, "\n### ")
    .replace(/<\/?(b|strong)[^>]*>/gi, "**")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "* $1\n")
    .replace(/<\/?[a-zA-Z0-9_-]+(?:\s+[^>]*?)?>/g, "") // 剝除其餘任何 HTML 標籤
    .replace(/[\u{10000}-\u{10ffff}\u2600-\u27bf\u2300-\u23ff\u2b50-\u2b55\u203c-\u2049]/gu, "") // Zero-Emoji
    .trim();
}

/**
 * 結構化渲染 AI 提煉摘要區塊
 */
function AiSummaryView({ summaryText }: { summaryText: string }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const lines = useMemo(() => {
    const cleaned = sanitizeRawText(summaryText);
    return cleaned.split("\n");
  }, [summaryText]);

  const hasLongContent = lines.length > 14;

  return (
    <div className="mb-10 rounded-xs bg-[#FAF7EE] dark:bg-[#1E1D1B] border border-[#E5DECA] dark:border-[#38352F] p-5 md:p-6 shadow-xs transition-all">
      {/* 頂部索引徽章與控制項 */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5DECA]/70 dark:border-[#38352F]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-accent rounded-xs" />
          <span className="font-mono text-xs font-bold text-text-primary tracking-wider">
            [ 智慧助教導讀 // KEY TAKEAWAYS ]
          </span>
          <span className="text-[10px] font-mono text-text-tertiary hidden sm:inline">
            (考研與課業精華萃取)
          </span>
        </div>

        {hasLongContent && (
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="font-mono text-xs text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1 cursor-pointer select-none"
          >
            {isCollapsed ? "[ 展開完整考點導讀 ⌄ ]" : "[ 收合導讀 ⌃ ]"}
          </button>
        )}
      </div>

      {/* 摘要內容本體 */}
      <div className={`space-y-2 transition-all ${isCollapsed ? "max-h-[160px] overflow-hidden relative" : ""}`}>
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return null;

          // 一級/二級標題 (### 或 ####)
          if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
            const headingText = trimmed.replace(/^#{2,3}\s+/, "");
            return (
              <h3
                key={`h3-${idx}`}
                className="text-sm md:text-base font-bold text-text-primary mt-4 mb-2 first:mt-0 tracking-tight flex items-center gap-2 border-b border-[#E5DECA]/50 pb-1"
              >
                <span className="font-mono text-xs text-text-tertiary select-none">#</span>
                <span>{renderInlineFormatting(headingText)}</span>
              </h3>
            );
          }

          if (trimmed.startsWith("#### ")) {
            const subHeadingText = trimmed.replace(/^####\s+/, "");
            return (
              <h4
                key={`h4-${idx}`}
                className="text-xs md:text-sm font-bold text-text-primary mt-3 mb-1.5 tracking-wide flex items-center gap-1.5 text-accent-dark dark:text-accent-light"
              >
                <span className="w-1 h-3 bg-text-tertiary rounded-xs inline-block" />
                <span>{renderInlineFormatting(subHeadingText)}</span>
              </h4>
            );
          }

          // 分隔線 (---)
          if (trimmed === "---") {
            return <hr key={`hr-${idx}`} className="my-3 border-t border-[#E5DECA]/60 dark:border-[#38352F]" />;
          }

          // 條列式項目 (* 或 -)
          const isBullet = /^\s*[\*\-]\s+/.test(line);
          const isNested = /^\s{2,}[\*\-]\s+/.test(line);

          if (isBullet) {
            const cleanBulletText = line.replace(/^\s*[\*\-]\s+/, "");
            return (
              <div
                key={`bullet-${idx}`}
                className={`flex items-start gap-2 text-xs md:text-sm text-text-secondary leading-relaxed my-1 ${
                  isNested ? "pl-5" : "pl-1"
                }`}
              >
                <span className="text-text-tertiary font-mono select-none mt-0.5 text-xs">
                  {isNested ? "–" : "•"}
                </span>
                <div className="flex-1">
                  {renderInlineFormatting(cleanBulletText)}
                </div>
              </div>
            );
          }

          // 一般段落文字
          return (
            <p key={`p-${idx}`} className="text-xs md:text-sm text-text-secondary leading-relaxed my-1">
              {renderInlineFormatting(trimmed)}
            </p>
          );
        })}

        {/* 漸變遮罩 (收合狀態時提示) */}
        {isCollapsed && (
          <div
            onClick={() => setIsCollapsed(false)}
            className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#FAF7EE] dark:from-[#1E1D1B] to-transparent flex items-end justify-center pb-2 cursor-pointer"
          >
            <span className="font-mono text-xs font-bold text-text-primary bg-surface/80 dark:bg-black/60 px-3 py-1 rounded-xs border border-[#E5DECA] shadow-xs">
              點擊展開剩餘 {lines.length} 行精選重點...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 導出筆記主體渲染元件：
 * 自動偵測並分離「AI 考點提煉」與「原作者說明」，徹底消除原始碼標籤裸露問題
 */
export default function NoteContentRenderer({ content, title }: NoteContentRendererProps) {
  const { aiSummary, authorNote } = useMemo(() => {
    if (!content) return { aiSummary: "", authorNote: "" };

    const clean = content
      .replace(/[\u{10000}-\u{10ffff}\u2600-\u27bf\u2300-\u23ff\u2b50-\u2b55\u203c-\u2049]/gu, "")
      .trim();

    // 判斷是否帶有 AI 摘要標籤開頭
    const markerRegex = /^(?:>\s*\[\s*內容要點提煉\s*\]|\*\*AI 摘要懶人包\*\*|>\s*\[\s*內容摘要\s*\])\s*\n+/;
    const match = clean.match(markerRegex);

    if (match) {
      const rest = clean.slice(match[0].length).trim();
      // 尋找最後一個 --- 分隔線（區分摘要與作者原話）
      const lastDividerIdx = rest.lastIndexOf("\n---");
      if (lastDividerIdx !== -1) {
        const summaryPart = rest.slice(0, lastDividerIdx).trim();
        const authorPart = rest.slice(lastDividerIdx + 4).trim();
        return {
          aiSummary: summaryPart,
          authorNote: authorPart === title ? "" : authorPart, // 若重複標題則省略
        };
      }
      return { aiSummary: rest, authorNote: "" };
    }

    return { aiSummary: "", authorNote: clean };
  }, [content, title]);

  return (
    <div className="w-full">
      {/* 1. 若有 AI 摘要，以「紙本讀書卡片（Study Flashcard）」專用容器渲染 */}
      {aiSummary && <AiSummaryView summaryText={aiSummary} />}

      {/* 2. 發布者補充說明 */}
      {authorNote ? (
        <div className="mb-10">
          {aiSummary && (
            <div className="font-mono text-xs text-text-tertiary mb-2.5 flex items-center gap-1.5">
              <span>[ 發布者補充說明 // AUTHOR NOTE ]</span>
            </div>
          )}
          <div className="p-4 md:p-5 rounded-xs bg-surface border border-border text-sm text-text-primary leading-relaxed whitespace-pre-wrap font-sans">
            {sanitizeRawText(authorNote)}
          </div>
        </div>
      ) : !aiSummary ? (
        <p className="text-text-secondary leading-relaxed whitespace-pre-wrap text-sm mb-10">
          這份筆記沒有提供文字補充說明。
        </p>
      ) : null}
    </div>
  );
}

/**
 * 供探索卡片 (Explore Cards) 提取無標籤乾淨預覽的工具函式
 */
export function extractCardSnippet(content: string | null | undefined): string {
  if (!content) return "這份筆記沒有提供詳細說明。";

  // 去除標頭標籤
  let clean = content
    .replace(/^(?:>\s*\[\s*內容要點提煉\s*\]|\*\*AI 摘要懶人包\*\*|>\s*\[\s*內容摘要\s*\])\s*/gi, "")
    .replace(/<\/?h[1-6][^>]*>/gi, " ")
    .replace(/<\/?(b|strong|p|div|span|li|ul|ol)[^>]*>/gi, " ")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[\*\-]\s+/gm, "")
    .replace(/\$([^\$]+)\$/g, "$1")
    .replace(/[\u{10000}-\u{10ffff}\u2600-\u27bf\u2300-\u23ff\u2b50-\u2b55\u203c-\u2049]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  // 若以 --- 分隔，優先選取有實質文字的段落
  if (clean.includes("---")) {
    const parts = clean.split("---").map((p) => p.trim()).filter(Boolean);
    clean = parts[parts.length - 1] || parts[0] || clean;
  }

  return clean || "這份筆記沒有提供詳細說明。";
}
