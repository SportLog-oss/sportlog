import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

/**
 * Cookie-bound Supabase client for Server Components and Route Handlers. Works in both:
 * Route Handlers can set cookies (session refresh persists), Server Components can't — the
 * setAll() call is a no-op there since Next throws if you try, and that's fine because
 * src/proxy.ts already refreshes the auth cookie on every request before an RSC ever runs.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // called from a Server Component render — cookies are read-only there, ignore
        }
      },
    },
  });
}
