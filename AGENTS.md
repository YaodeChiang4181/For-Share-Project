<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 專案部署環境與狀態 (Deployment Environment & Memory)
- **正式環境網址 (Production URL)**: `https://for-shareproject1.vercel.app`
- **部署平台**: Vercel
- **中央大學 Portal SSO 設定規範**:
  - Single Sign On URL: `https://for-shareproject1.vercel.app/login`
  - Return To Address: `https://for-shareproject1.vercel.app/api/auth/callback/ncu`
  - Vercel 必備環境變數：`NEXTAUTH_URL="https://for-shareproject1.vercel.app"`、`NEXTAUTH_SECRET`、`NCU_CLIENT_ID`、`NCU_CLIENT_SECRET`

# 程式碼變更與版本控制規範 (Code Change & Auto Git Rule)
- **只要程式碼有任何改動**：每次完成程式碼修改或修正後，必須主動執行 `git add .`、`git commit -m "..."` 與 `git push`，確保 Vercel 線上環境與 GitHub 即時同步，不需要使用者手動要求。

