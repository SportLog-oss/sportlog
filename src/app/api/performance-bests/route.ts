import { NextResponse } from "next/server";
import { getSupabaseForRequest } from "@/lib/data/supabaseClient";

type AttemptRow = {
  id: string;
  status: "active" | "merged_away" | "orphaned";
  merged_into_attempt_id: string | null;
};

type SourceRow = {
  attempt_id: string;
  source_type: "workout_garmin" | "workout_concept2" | "benchmark_entry";
  source_quality: "device_exact" | "activity_derived";
};

function resolveRoot(attemptId: string, attempts: Map<string, AttemptRow>): string | null {
  let current = attempts.get(attemptId);
  const seen = new Set<string>();

  while (current) {
    if (seen.has(current.id)) return null;
    seen.add(current.id);
    if (current.status !== "merged_away") return current.id;
    if (!current.merged_into_attempt_id) return null;
    current = attempts.get(current.merged_into_attempt_id);
  }

  return null;
}

export async function GET() {
  const supabase = await getSupabaseForRequest();
  const [bestsResult, registryResult, attemptsResult, sourcesResult] = await Promise.all([
    supabase.from("performance_bests").select("attempt_id,kind,value,unit,lower_is_better,occurred_at"),
    supabase.from("performance_kind_registry").select("kind,label,sport,target_distance_m,target_duration_s"),
    supabase.from("performance_attempts").select("id,status,merged_into_attempt_id"),
    supabase.from("performance_sources").select("attempt_id,source_type,source_quality"),
  ]);

  const error = bestsResult.error ?? registryResult.error ?? attemptsResult.error ?? sourcesResult.error;
  if (error) {
    return NextResponse.json({ error: "Gemeinsame Bestleistungen konnten nicht geladen werden." }, { status: 500 });
  }

  const attempts = new Map(
    ((attemptsResult.data ?? []) as AttemptRow[]).map((attempt) => [attempt.id, attempt])
  );
  const sourcesByRoot = new Map<string, SourceRow[]>();

  for (const source of (sourcesResult.data ?? []) as SourceRow[]) {
    const root = resolveRoot(source.attempt_id, attempts);
    if (!root) continue;
    sourcesByRoot.set(root, [...(sourcesByRoot.get(root) ?? []), source]);
  }

  const registry = new Map(
    (registryResult.data ?? []).map((entry) => [entry.kind, entry])
  );

  const bests = (bestsResult.data ?? []).map((best) => {
    const meta = registry.get(best.kind);
    const sources = sourcesByRoot.get(best.attempt_id) ?? [];
    return {
      attemptId: best.attempt_id,
      kind: best.kind,
      label: meta?.label ?? best.kind,
      sport: meta?.sport ?? "rowing",
      targetDistanceMeters: meta?.target_distance_m == null ? null : Number(meta.target_distance_m),
      targetDurationSeconds: meta?.target_duration_s == null ? null : Number(meta.target_duration_s),
      value: Number(best.value),
      unit: best.unit,
      lowerIsBetter: best.lower_is_better,
      occurredAt: best.occurred_at,
      sources: [...new Set(sources.map((source) => source.source_type))],
      exactSourceAvailable: sources.some((source) => source.source_quality === "device_exact"),
    };
  });

  return NextResponse.json({ bests });
}
