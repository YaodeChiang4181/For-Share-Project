---
name: auto-git-push
description: >-
  在專案程式碼有任何改動時，自動執行 git add、git commit 與 git push，使 GitHub 與 Vercel 線上保持最新。
---

# Auto Git Push Skill

## 核心職責
只要在會話中對專案進行了任何程式碼修改、錯誤修補或功能更新，在完成修改後必須自動將變更提交並推送到遠端倉庫，確保 Vercel 線上部署同步更新。

## 標準操作步驟
1. 檢查變更檔案：
   ```powershell
   git status -s
   ```
2. 將所有修改暫存：
   ```powershell
   git add .
   ```
3. 產生具結構性的語意化 Commit 訊息：
   ```powershell
   git commit -m "fix(auth): safe portal oauth sso token exchange and response handling"
   ```
4. 推送至遠端主要分支：
   ```powershell
   git push
   ```
5. 驗證推送結果，通知使用者已成功部署至 GitHub / Vercel。
