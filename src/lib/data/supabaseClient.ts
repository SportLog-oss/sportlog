import { headers } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceSessionClient } from "./supabaseServiceSession";

/**
 * Picks the right Supabase client for the current request so every store.ts query runs
 * RLS-scoped as the right identity:
 *  (a) mobile — an `Authorization: Bearer <access_token>` header
 *  (b) web — a Supabase session cookie (set by src/proxy.ts / the login route)
 *  (c) service-to-service routes (sync, cron/*) which have neither — a long-lived
 *      service-session fallback (see supabaseServiceSession.ts)
 *
 * The `Authorization: Bearer` header is NOT trusted blindly for case (a): Vercel's own cron
 * trigger mechanism sends `Authorization: Bearer <CRON_SECRET>` to /api/cron/* (that header
 * name/format is fixed by Vercel, not something those routes can opt out of), which looks like
 * a bearer token but isn't a Supabase JWT — handing it straight to PostgREST fails with
 * "Expected 3 parts in JWT; got 1". So the token is validated with getUser() first; only a
 * real, live Supabase session takes this path, everything else falls through to (b) then (c).
 */
export async function getSupabaseForRequest(): Promise<SupabaseClient> {
  const hdrs = await headers();
  const bearer = hdrs.get("authorization")?.replace(/^Bearer /i, "");
  if (bearer) {
    const bearerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user: bearerUser },
    } = await bearerClient.auth.getUser(bearer);
    if (bearerUser) return bearerClient;
  }

  const cookieClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await cookieClient.auth.getUser();
  if (user) return cookieClient;

  return getServiceSessionClient();
}
