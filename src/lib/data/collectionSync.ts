import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Every `saveX(fullArray)` function in store.ts receives the *entire* desired collection
 * (routes always read-mutate-save the whole array) — this diffs that against what's already
 * in the table and upserts + deletes-what's-missing, instead of naively delete-all-reinsert-all
 * (which would lose created_at and break child-table FKs like benchmark_entries.benchmark_id).
 *
 * Only for tables with a simple single-column id (goals_and_races, strength_sessions,
 * illness_log, mental_health_checkins, benchmarks). Tables keyed by a natural
 * composite key (activity_notes, training_log_entries) never shrink via the app's save flow —
 * see the bespoke upsert-only functions for those in store.ts.
 */
export async function syncCollection(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  opts: { scope?: Record<string, unknown> } = {}
): Promise<void> {
  let existingQuery = supabase.from(table).select("id");
  if (opts.scope) existingQuery = existingQuery.match(opts.scope);
  const { data: existing, error: selectError } = await existingQuery;
  if (selectError) throw selectError;

  const keep = new Set(rows.map((r) => String(r.id)));
  const toDelete = (existing ?? []).map((r) => String((r as { id: unknown }).id)).filter((id) => !keep.has(id));

  if (toDelete.length) {
    const { error } = await supabase.from(table).delete().in("id", toDelete);
    if (error) throw error;
  }

  if (rows.length) {
    const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }
}
