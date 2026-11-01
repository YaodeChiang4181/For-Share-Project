export const dynamic = "force-dynamic";

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthErrorDetail, clearAuthErrorDetail } from "@/lib/auth-error-store";

const handler = NextAuth(authOptions);

async function authHandlerWithDetail(req: any, ctx: any) {
  const res = await handler(req, ctx);
  const detail = getAuthErrorDetail();

  if (res && detail) {
    const newHeaders = new Headers(res.headers);
    // 透過 Cookie 傳遞詳細錯誤訊息，確保跨多次 302 跳轉（callback -> error -> signin -> login）也能完整抵達前端
    newHeaders.append(
      "Set-Cookie",
      `ncu_auth_error=${encodeURIComponent(detail)}; Path=/; Max-Age=120; SameSite=Lax`
    );

    const location = res.headers.get("location");
    if ((res.status === 302 || res.status === 307) && location && location.includes("error=")) {
      const separator = location.includes("?") ? "&" : "?";
      const newLocation = `${location}${separator}detail=${encodeURIComponent(detail)}`;
      newHeaders.set("location", newLocation);
    }

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  }

  return res;
}

export { authHandlerWithDetail as GET, authHandlerWithDetail as POST };
