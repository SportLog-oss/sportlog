import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";

// Used only by the service-to-service routes that already bypass user auth today
// (/api/sync, /api/cron/sync, /api/cron/reminders — gated by SYNC_SECRET/CRON_SECRET in
// src/proxy.ts's PUBLIC_PATHS). Refreshes the single app account's session from a long-lived
// refresh token so RLS's auth.uid() resolves correctly without a service-role key.
let cached: { client: SupabaseClient; expiresAtMs: number } | null = null;

export async function getServiceSessionClient(): Promise<SupabaseClient> {
  if (cached && cached.expiresAtMs > Date.now() + 30_000) return cached.client;

  const refreshToken = process.env.SUPABASE_SERVICE_USER_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error(
      "SUPABASE_SERVICE_USER_REFRESH_TOKEN is not set — required for sync/cron routes to authenticate against Supabase. Run scripts/create-supabase-user.ts and set the printed refresh token."
    );
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    throw new Error(`Failed to establish Supabase service session: ${error?.message ?? "no session returned"}`);
  }

  cached = {
    client,
    expiresAtMs: data.session.expires_at ? data.session.expires_at * 1000 : Date.now() + 3_600_000,
  };
  return client;
}
