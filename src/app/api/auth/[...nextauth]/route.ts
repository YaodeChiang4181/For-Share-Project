export const dynamic = "force-dynamic";

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthErrorDetail, clearAuthErrorDetail } from "@/lib/auth-error-store";

const handler = NextAuth(authOptions);

async function authHandlerWithDetail(req: any, ctx: any) {
  const res = await handler(req, ctx);
  if (res && (res.status === 302 || res.status === 307)) {
    const location = res.headers.get("location");
    const detail = getAuthErrorDetail();
    if (location && location.includes("error=OAuthCallback") && detail) {
      clearAuthErrorDetail();
      const separator = location.includes("?") ? "&" : "?";
      const newLocation = `${location}${separator}detail=${encodeURIComponent(detail)}`;
      const newHeaders = new Headers(res.headers);
      newHeaders.set("location", newLocation);
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: newHeaders,
      });
    }
  }
  return res;
}

export { authHandlerWithDetail as GET, authHandlerWithDetail as POST };
