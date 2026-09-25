import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isValidSessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/auth";

// Shared-password gate — see src/lib/auth.ts for the session cookie design.
// Named proxy.ts (not middleware.ts): Next.js 16 deprecated and renamed the
// convention. Defaults to the Node.js runtime here, which is what lets
// lib/auth.ts use Node's crypto module directly instead of the Web Crypto
// API a proxy stuck on the Edge runtime would need.
export function proxy(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (isValidSessionCookieValue(cookie)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Everything except: the login page itself (else a redirect loop), the
    // login/logout API routes (else the password could never be submitted),
    // GET /api/cron/sync (Vercel's Cron Job calls this with no browser
    // session at all — it has its own CRON_SECRET check), static assets,
    // and the icon/manifest files the browser fetches on its own on every
    // page including /login itself, pre-auth — gating those doesn't hide
    // anything (they're not data), it just breaks the tab icon and PWA
    // manifest for anyone not yet logged in (confirmed: icon0.svg and
    // manifest.json both 307'd to /login before this was added).
    "/((?!login|api/auth|api/cron/sync|_next/static|_next/image|favicon.ico|apple-icon.png|icon0.svg|icon1.png|manifest.json|web-app-manifest-192x192.png|web-app-manifest-512x512.png).*)",
  ],
};
