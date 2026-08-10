// Public Supabase project config. The anon/publishable key is safe to expose client-side —
// access is enforced by Postgres RLS policies, not by keeping this key secret.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://phrsoefcztnbfsqyghmn.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_rBDJFZeDCd4IP6q8P5NB4Q_6wnCUyoa";
