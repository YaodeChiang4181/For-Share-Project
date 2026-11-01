// 全域錯誤訊息暫存（用於將 NextAuth 內部被屏蔽的 OAuthCallback 具體原因傳遞給登入頁面）
let currentAuthErrorDetail = "";

export function setAuthErrorDetail(detail: string) {
  currentAuthErrorDetail = detail;
}

export function getAuthErrorDetail(): string {
  return currentAuthErrorDetail;
}

export function clearAuthErrorDetail() {
  currentAuthErrorDetail = "";
}
