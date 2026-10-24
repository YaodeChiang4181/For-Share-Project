import Link from "next/link";

/* ── How it works steps ── */
const workflowSteps = [
  {
    index: "01",
    label: "提交上傳",
    title: "整理課堂脈絡與考古題",
    desc: "將經由自己消化驗證的講義重點、期中考古詳解數位化，以乾淨結構建立條目。",
  },
  {
    index: "02",
    label: "同儕驗證",
    title: "雙層品質標註與多維反饋",
    desc: "由同修同學與跨校系社群進行客觀標註與評分，杜絕空泛或抄襲素材。",
  },
  {
    index: "03",
    label: "有效流通",
    title: "獲取同系或跨院系核心精華",
    desc: "需要備考的同學即時檢索下載，節省大海撈針的時間，讓知識在同儕間自由流動。",
  },
  {
    index: "04",
    label: "實質回饋",
    title: "累積知識積分與兌換權益",
    desc: "每一次優質分享皆獲取平台積分，可自由兌換超商商品卡或進階權益，讓付出獲得回報。",
  },
];

/* ── Verified Note Sheet Mock Data ── */
const featuredNote = {
  institution: "國立中央大學",
  department: "經濟學系",
  courseType: "大一必修",
  code: "ECON-101 // DOC-2026-F1",
  title: "個體經濟學（一）：消費者選擇理論與跨期決策整合",
  author: "Y.D. Chiang",
  pages: "14 頁 (PDF)",
  score: "4.9 / 5.0",
  feedbackCount: "32 則同儕評價",
  cost: "20 點積分",
  highlights: [
    "邊際替代率（MRS）與預算線切點條件分析之幾何推導",
    "Slutsky 方程在替代效應與所得效應之分解（112-113 期中高頻考點）",
    "跨期消費模型下利率變動對儲蓄行為之實質影響判定",
  ],
};

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* ═══════════════════════════════════
           HERO SECTION
      ═══════════════════════════════════ */}
      <section className="pt-32 pb-20 lg:pt-40 lg:pb-28 border-b border-border" id="hero">
        <div className="mx-auto max-w-5xl px-6 lg:px-8 text-center">
          {/* Editorial Index Badge */}
          <div className="mb-8">
            <span className="inline-block px-3 py-1 text-xs font-mono tracking-widest text-text-tertiary border border-border bg-surface rounded-xs">
              [ ARCHIVE 2026 // 校園開放筆記索引庫 ]
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-text-primary leading-[1.2] mb-8">
            學長姐沒留下的考古題與重點，
            <br />
            在線上<span className="highlighter">有系統地找到</span>。
          </h1>

          {/* Subheadline */}
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-text-secondary leading-relaxed mb-10">
            ForShare 是專為大專院校學生建立的開放知識共享平台。
            整理你的課堂精華賺取實質積分，透過同儕標註讓優質筆記脫穎而出，
            打破私下封閉的直屬制度，實現校園知識扁平化流通。
          </p>

          {/* Minimalist CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center">
            <Link
              href="/explore"
              id="hero-cta-explore"
              className="w-full sm:w-auto px-7 py-3 rounded-md text-sm font-semibold text-text-inverse bg-primary hover:bg-primary-light transition-colors"
            >
              檢索開放筆記庫 →
            </Link>
            <Link
              href="/register"
              id="hero-cta-register"
              className="w-full sm:w-auto px-7 py-3 rounded-md text-sm font-semibold text-text-primary bg-surface border border-border hover:border-text-primary transition-colors"
            >
              免費註冊帳號
            </Link>
          </div>

          {/* Institutional Note Preview Sheet (Tangible Artifact) */}
          <div className="mt-16 mx-auto max-w-3xl text-left">
            <div className="paper-card p-7 sm:p-9 bg-surface">
              {/* Document Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-border text-xs text-text-tertiary font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent inline-block" />
                  <span className="text-text-primary font-medium">{featuredNote.institution}</span>
                  <span>/</span>
                  <span>{featuredNote.department}</span>
                  <span>/</span>
                  <span className="px-1.5 py-0.5 rounded-xs bg-surface-muted text-text-secondary">
                    {featuredNote.courseType}
                  </span>
                </div>
                <span>{featuredNote.code}</span>
              </div>

              {/* Document Title & Highlights */}
              <div className="py-6">
                <h3 className="text-xl sm:text-2xl font-bold text-text-primary mb-4 leading-snug">
                  {featuredNote.title}
                </h3>
                <div className="space-y-2.5">
                  {featuredNote.highlights.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-sm text-text-secondary leading-relaxed">
                      <span className="text-xs font-mono text-text-tertiary mt-1">[{idx + 1}]</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Document Footer Metadata (Zero Emoji) */}
              <div className="pt-5 border-t border-border flex flex-wrap items-center justify-between gap-4 text-xs text-text-tertiary">
                <div className="flex flex-wrap items-center gap-3">
                  <span>貢獻者：{featuredNote.author}</span>
                  <span>·</span>
                  <span>規格：{featuredNote.pages}</span>
                  <span>·</span>
                  <span className="text-text-secondary font-medium">評分：{featuredNote.score} ({featuredNote.feedbackCount})</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="px-2 py-0.5 rounded-xs bg-surface-muted text-text-primary font-medium">
                    {featuredNote.cost}
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-text-tertiary font-mono">
              [ 示範文件：真實收錄之期中考整理結構 ]
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════
           HOW IT WORKS SECTION (EDITORIAL LIST)
      ═══════════════════════════════════ */}
      <section className="py-20 lg:py-28 border-b border-border bg-surface" id="how-it-works">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="mb-14">
            <span className="text-xs font-mono tracking-wider text-text-tertiary uppercase block mb-2">
              [ 01 // WORKFLOW ]
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
              校園知識如何透過平台循環？
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              將過去沉睡在個人電腦的零散筆記，轉化為具備長效價值的校園資產。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            {workflowSteps.map((step) => (
              <div
                key={step.index}
                className="p-6 rounded-md border border-border bg-background hover:border-text-secondary/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                  <span className="text-xs font-mono font-bold text-text-primary">
                    INDEX // {step.index}
                  </span>
                  <span className="text-xs font-mono text-text-tertiary">
                    {step.label}
                  </span>
                </div>
                <h3 className="text-base font-bold text-text-primary mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════
           MEMBERSHIP COMPARISON (MINIMALIST)
      ═══════════════════════════════════ */}
      <section className="py-20 lg:py-28 border-b border-border" id="membership">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="mb-14 text-center">
            <span className="text-xs font-mono tracking-wider text-text-tertiary uppercase block mb-2">
              [ 02 // ACCESS TIERS ]
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
              權限方案與使用機制
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              提供彈性透明的會員規範，所有註冊用戶皆享有基本閱覽與分享權利。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free Tier */}
            <div className="paper-card p-8 bg-surface">
              <div className="flex justify-between items-baseline mb-3">
                <h3 className="text-base font-bold text-text-primary">基礎使用者</h3>
                <span className="text-xs font-mono text-text-tertiary">FREE TIER</span>
              </div>
              <div className="text-3xl font-bold text-text-primary mb-2">
                $0 <span className="text-xs font-normal text-text-tertiary font-mono">/ 月</span>
              </div>
              <p className="text-xs text-text-secondary mb-6">
                適合一般修課、尋找零星參考資料的學生。
              </p>
              <ul className="space-y-3 mb-8 text-sm text-text-secondary border-t border-border pt-6">
                <li className="flex items-start gap-2.5">
                  <span className="text-text-tertiary font-mono">—</span>
                  <span>單一關鍵字與系所分類檢索</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-text-tertiary font-mono">—</span>
                  <span>自由上傳筆記並獲得基礎點數回饋</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-text-tertiary font-mono">—</span>
                  <span>每日討論區留言上限 5 則</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-text-tertiary font-mono">—</span>
                  <span>參與筆記評分與同儕審查標籤</span>
                </li>
              </ul>
              <Link
                href="/register"
                className="block w-full py-2.5 rounded-sm text-center text-xs font-semibold border border-border text-text-primary hover:border-text-primary transition-colors"
              >
                免費加入
              </Link>
            </div>

            {/* Premium Tier */}
            <div className="paper-card p-8 bg-surface border-2 border-text-primary">
              <div className="flex justify-between items-baseline mb-3">
                <h3 className="text-base font-bold text-text-primary">Share 會員</h3>
                <span className="text-xs font-mono text-text-primary font-bold">[ 推薦 ]</span>
              </div>
              <div className="text-3xl font-bold text-text-primary mb-2">
                $99 <span className="text-xs font-normal text-text-tertiary font-mono">/ 季</span>
              </div>
              <p className="text-xs text-text-secondary mb-6">
                適合備戰國考、雙主修或重度知識分享者。
              </p>
              <ul className="space-y-3 mb-8 text-sm text-text-secondary border-t border-border pt-6">
                <li className="flex items-start gap-2.5">
                  <span className="text-text-primary font-mono">+</span>
                  <span className="font-medium text-text-primary">多條件複合交叉檢索（學年度/教授/題型）</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-text-primary font-mono">+</span>
                  <span className="font-medium text-text-primary">上傳筆記獲取雙倍積分回饋權重</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-text-primary font-mono">+</span>
                  <span>無上限討論留言與作者私訊發問</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-text-primary font-mono">+</span>
                  <span>商城兌換額度上限完全解除</span>
                </li>
              </ul>
              <Link
                href="/register"
                className="block w-full py-2.5 rounded-sm text-center text-xs font-semibold text-text-inverse bg-primary hover:bg-primary-light transition-colors"
              >
                升級 Share 會員
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════
           FINAL QUIET CALL TO ACTION
      ═══════════════════════════════════ */}
      <section className="py-20 lg:py-24" id="final-cta">
        <div className="mx-auto max-w-3xl px-6 lg:px-8 text-center">
          <div className="p-10 sm:p-14 rounded-md border border-border bg-surface">
            <span className="text-xs font-mono tracking-wider text-text-tertiary uppercase block mb-3">
              [ GET STARTED ]
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
              建立專屬於你的校園知識資產
            </h2>
            <p className="text-sm text-text-secondary max-w-lg mx-auto mb-8 leading-relaxed">
              將你每學期的付出整理成冊，與全校同學互通有無。
              現在加入，立即探索已收錄的各系所筆記。
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/register"
                id="final-cta-button"
                className="px-6 py-2.5 rounded-sm text-xs font-semibold text-text-inverse bg-primary hover:bg-primary-light transition-colors"
              >
                免費建立帳號 →
              </Link>
              <Link
                href="/explore"
                className="px-6 py-2.5 rounded-sm text-xs font-semibold text-text-primary border border-border hover:border-text-primary transition-colors"
              >
                先去逛逛筆記庫
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
