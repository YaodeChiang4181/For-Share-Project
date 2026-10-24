# ForShare — 校園筆記與知識共享平台

> 打破傳統「直屬制度」的資源壟斷與資訊不對稱，建立去中心化、結構化且具實質誘因的校園學習資源生態系。

---

## 專案核心願景

在大學校園中，期中考複習重點、考古題詳解與修課攻略長期依賴垂直的「直屬學長姐」關係傳承。這種私有與封閉的流通方式，往往造成資源斷層與分配不均。

**ForShare** 旨在以線上開放索引庫與社群機制打破此一藩籬：
- **同儕驗證與標註**：透過多維度評分與評論，杜絕劣質與抄襲內容。
- **有效迴響與實質變現**：以知識積分（Points）鼓勵學長姐主動數位化筆記，並提供實質商品卡兌換管道。
- **校園知識扁平化**：各系所大一必修、通識與進階課程筆記公開檢索，降低備考門檻，實踐教育平權。

---

## 介面設計語彙（去 AI 感與紙本美學）

本專案堅拒時下 AI 生成工具（如 v0、Lovable）常見的公式化模板（如滿版漂浮霓虹光暈、行行濫用 Emoji、空泛的假大空數據標籤），採取**人文編輯感（Editorial）與紙質文具風格**：

- **暖米白畫布（Warm Off-White Canvas）**：採用 `#F9F8F6` 柔和燕麥色作為基底，搭配純白（`#FFFFFF`）抬升紙張卡片，護眼且具沉浸感。
- **沉澱墨水排版（Ink Typography）**：使用溫和的炭黑（`#1A1918`）與石墨灰（`#5E5953`），徹底避免刺眼的死黑與千篇一律的紫藍漸層。
- **零 Emoji 政策（Zero Emoji Policy）**：介面全面回歸經典的排版層級、等寬編號標記（如 `DOC-2026-F1`、`[ 提示 ]`）與 Unicode 幾何符號（`·`、`—`、`→`），消除視覺雜訊。
- **螢光筆劃記亮點（Highlighter Accents）**：關鍵字以淡鵝黃色（`#F5EBAC`）模擬手寫劃記，喚起實體讀書筆記的記憶。
- **真實物件展示（Tangible Note Sheets）**：以真實的系所筆記結構取代抽象功能六宮格，強化可信度與實用價值。

---

## 技術架構

- **前端框架**：[Next.js 16 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/)
- **樣式系統**：[Tailwind CSS v4](https://tailwindcss.com/)（自定義 Design Tokens，移除冗餘動畫）
- **身份驗證**：[NextAuth.js](https://next-auth.js.org/)
- **資料庫與 ORM**：[Prisma ORM](https://www.prisma.io/)（搭配 SQLite 開發環境與 Neon PostgreSQL 生產環境支援）
- **雲端存取**：AWS S3 / Cloudflare R2（講義與 PDF 筆記存儲）
- **社群整合**：LINE Bot SDK（快速上傳與校園推播通知）

---

## 本地開發指南

### 1. 安裝相依套件
```bash
npm install
```

### 2. 環境變數設定
複製或設定 `.env` 檔案，確保包含資料庫連線與 NextAuth 密鑰。

### 3. 資料庫遷移與 Prisma Client 生成
```bash
npx prisma generate
```

### 4. 啟動開發伺服器
```bash
npm run dev
```

開啟瀏覽器造訪 [http://localhost:3000](http://localhost:3000) 即可檢視專案。

---

## 授權與宣告

本專案僅供學術交流與學習共享使用，尊重智慧財產權與個人創作內容。
