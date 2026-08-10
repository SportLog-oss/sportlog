import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";

// Routes that must stay reachable without a user session:
// - /login and its API so the user can actually log in
// - /api/sync, /api/cron/sync and /api/cron/reminders, which are service-to-service
//   (SYNC_SECRET / CRON_SECRET), not user-facing, and are called by infrastructure that
//   can't hold a browser cookie or a Supabase session
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/sync", "/api/cron/sync", "/api/cron/reminders"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function unauthorized(req: NextRequest, pathname: string) {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

// Mobile sends `Authorization: Bearer <access_token>` instead of a cookie.
async function hasValidBearerSession(bearer: string): Promise<boolean> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser(bearer);
  return !!user;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname) || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const bearer = req.headers.get("authorization")?.replace(/^Bearer /i, "");
  if (bearer) {
    return (await hasValidBearerSession(bearer)) ? NextResponse.next() : unauthorized(req, pathname);
  }

  // Web: cookie-based Supabase session. @supabase/ssr needs the request/response cookie
  // adapter pair below (not next/headers' cookies()) to be able to refresh the session and
  // rewrite the cookie on the response as it flows through middleware.
  let response = NextResponse.next({ request: req });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        response = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) return response;
  return unauthorized(req, pathname);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
