import { getSupabaseForRequest } from "./supabaseClient";
import { addDays, type PlanningMatchStatus, type PlanningWorkoutMatch, type TrainingReflection } from "@/lib/planning";
import { buildMatchSuggestion } from "@/lib/planningMatches";
import { getPlanningWeek } from "./planningStore";
import { getWorkouts } from "./store";

export class PlanningMatchConflictError extends Error {}

async function resolveConfirmedMatchForActivity(activityId: number) {
  const supabase = await getSupabaseForRequest();
  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .select("id")
    .eq("source", "garmin")
    .eq("external_id", String(activityId))
    .maybeSingle();
  if (workoutError) throw workoutError;
  if (!workout) return null;

  const { data: match, error: matchError } = await supabase
    .from("planned_session_workouts")
    .select("planned_session_id,workout_id")
    .eq("workout_id", workout.id)
    .eq("match_status", "confirmed")
    .maybeSingle();
  if (matchError) throw matchError;
  return match;
}

export async function getTrainingReflectionByActivityId(activityId: number): Promise<TrainingReflection | null> {
  const supabase = await getSupabaseForRequest();
  const match = await resolveConfirmedMatchForActivity(activityId);
  if (!match) return null;
  const { data, error } = await supabase
    .from("training_reflections")
    .select("feeling,perceived_exertion,deviation_reason,note,updated_at")
    .eq("planned_session_id", match.planned_session_id)
    .eq("workout_id", match.workout_id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    feeling: data.feeling,
    perceivedExertion: data.perceived_exertion,
    deviationReason: data.deviation_reason,
    note: data.note,
    updatedAt: data.updated_at,
  } as TrainingReflection;
}

export async function saveTrainingReflectionByActivityId(activityId: number, reflection: Omit<TrainingReflection, "updatedAt">) {
  const match = await resolveConfirmedMatchForActivity(activityId);
  if (!match) throw new PlanningMatchConflictError("Diese Aktivität ist keiner bestätigten Plan-Einheit zugeordnet.");
  return saveTrainingReflection(match.planned_session_id, match.workout_id, reflection);
}

export async function getPlanningMatches(weekStart: string): Promise<PlanningWorkoutMatch[]> {
  const supabase = await getSupabaseForRequest();
  const [week, workouts, linksResult, reflectionsResult, logsResult] = await Promise.all([
    getPlanningWeek(weekStart), getWorkouts(),
    supabase.from("planned_session_workouts").select("*").gte("created_at", "1970-01-01"),
    supabase.from("training_reflections").select("*"),
    supabase.from("training_log_entries").select("activity_id,pain,injury,soreness"),
  ]);
  if (linksResult.error) throw linksResult.error;
  if (reflectionsResult.error) throw reflectionsResult.error;
  if (logsResult.error) throw logsResult.error;
  const links = linksResult.data ?? [];
  const reflectionByMatch = new Map((reflectionsResult.data ?? []).map((row) => [`${row.planned_session_id}:${row.workout_id}`, {
    feeling: row.feeling,
    perceivedExertion: row.perceived_exertion,
    deviationReason: row.deviation_reason,
    note: row.note,
    updatedAt: row.updated_at,
  } as TrainingReflection]));
  const logByActivity = new Map((logsResult.data ?? []).map((row) => [String(row.activity_id), {
    pain: (row.pain as { bodyPart: string; intensity: number }[]) ?? [],
    injury: Boolean(row.injury),
    soreness: row.soreness == null ? null : Number(row.soreness),
  }]));
  const workoutById = new Map(workouts.map((workout) => [workout.id, workout]));
  const confirmedElsewhere = new Set(links.filter((link) => link.match_status === "confirmed").map((link) => link.workout_id as string));
  const results: PlanningWorkoutMatch[] = [];

  for (const session of week.sessions.filter((item) => item.status !== "cancelled")) {
    const sessionLinks = links.filter((link) => link.planned_session_id === session.id);
    for (const link of sessionLinks.filter((item) => item.match_status !== "rejected")) {
      const workout = workoutById.get(link.workout_id as string);
      if (!workout) continue;
      const suggestion = buildMatchSuggestion(session, workout);
      results.push({ ...suggestion, status: link.match_status as PlanningMatchStatus, score: Number(link.match_score ?? suggestion.score), reasons: (link.match_reasons as string[]) ?? suggestion.reasons, reflection: reflectionByMatch.get(`${session.id}:${workout.id}`) ?? null, postWorkoutLog: workout.externalId ? logByActivity.get(workout.externalId) ?? null : null });
    }
    const existingIds = new Set(sessionLinks.map((link) => link.workout_id as string));
    const suggestions = workouts
      .filter((workout) => !existingIds.has(workout.id) && !confirmedElsewhere.has(workout.id) && workout.startedAt.slice(0, 10) >= addDays(weekStart, -1) && workout.startedAt.slice(0, 10) <= addDays(weekStart, 7))
      .map((workout) => buildMatchSuggestion(session, workout)).filter((match) => match.score >= 0.55)
      .sort((a, b) => b.score - a.score).slice(0, 3);
    results.push(...suggestions.map((suggestion) => ({ ...suggestion, reflection: null, postWorkoutLog: null })));
  }
  return results;
}

export async function saveTrainingReflection(sessionId: string, workoutId: string, reflection: Omit<TrainingReflection, "updatedAt">) {
  const supabase = await getSupabaseForRequest();
  const { data: match, error: matchError } = await supabase.from("planned_session_workouts").select("match_status").eq("planned_session_id", sessionId).eq("workout_id", workoutId).maybeSingle();
  if (matchError) throw matchError;
  if (match?.match_status !== "confirmed") throw new PlanningMatchConflictError("Eine Reflexion benötigt eine bestätigte Plan-Ist-Zuordnung.");
  const updatedAt = new Date().toISOString();
  const { data, error } = await supabase.from("training_reflections").upsert({
    planned_session_id: sessionId,
    workout_id: workoutId,
    feeling: reflection.feeling,
    perceived_exertion: reflection.perceivedExertion,
    deviation_reason: reflection.deviationReason,
    note: reflection.note,
    updated_at: updatedAt,
  }, { onConflict: "planned_session_id,workout_id" }).select("*").single();
  if (error) throw error;
  return {
    feeling: data.feeling,
    perceivedExertion: data.perceived_exertion,
    deviationReason: data.deviation_reason,
    note: data.note,
    updatedAt: data.updated_at,
  } as TrainingReflection;
}

export async function setPlanningMatch(sessionId: string, input: { workoutId: string; status: "confirmed" | "rejected"; score?: number; reasons?: string[] }) {
  const supabase = await getSupabaseForRequest();
  const { error } = await supabase.rpc("set_planned_session_workout_match", {
    p_session_id: sessionId, p_workout_id: input.workoutId, p_status: input.status, p_score: input.score ?? null, p_reasons: input.reasons ?? [],
  });
  if (error?.code === "23505") throw new PlanningMatchConflictError("Diese Aktivität ist bereits einer anderen Plan-Einheit zugeordnet.");
  if (error) throw error;
  return { ok: true };
}

export async function removePlanningMatch(sessionId: string, workoutId: string) {
  const supabase = await getSupabaseForRequest();
  const { error } = await supabase.rpc("remove_planned_session_workout_match", { p_session_id: sessionId, p_workout_id: workoutId });
  if (error) throw error;
  return { ok: true };
}
