import { NextRequest, NextResponse } from "next/server";

// Routes that must stay reachable without a user session:
// - /login and its API so the user can actually log in
// - /api/sync and /api/cron/sync, which are service-to-service (SYNC_SECRET / CRON_SECRET),
//   not user-facing, and are called by infrastructure that can't hold a browser cookie
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/sync", "/api/cron/sync"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function hasValidSession(req: NextRequest): boolean {
  const sessionToken = process.env.SESSION_TOKEN;
  if (!sessionToken) return true; // not configured yet — fail open rather than lock everyone out
  const cookie = req.cookies.get("sportlog_session")?.value;
  if (cookie === sessionToken) return true;
  const headerPassword = req.headers.get("x-app-password");
  if (headerPassword && process.env.APP_PASSWORD && headerPassword === process.env.APP_PASSWORD) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname) || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  if (hasValidSession(req)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
