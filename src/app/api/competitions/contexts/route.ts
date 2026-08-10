import { NextResponse } from "next/server";
import { getSupabaseForRequest } from "@/lib/data/supabaseClient";

export async function GET() {
  const supabase = await getSupabaseForRequest();
  const { data: sessions, error: sessionsError } = await supabase
    .from("planned_sessions")
    .select("id,race_id")
    .not("race_id", "is", null);
  if (sessionsError) throw sessionsError;
  if (!sessions?.length) return NextResponse.json({});

  const { data: links, error: linksError } = await supabase
    .from("planned_session_workouts")
    .select("planned_session_id,workout_id")
    .in("planned_session_id", sessions.map((session) => session.id))
    .eq("match_status", "confirmed");
  if (linksError) throw linksError;
  if (!links?.length) return NextResponse.json({});

  const { data: workouts, error: workoutsError } = await supabase
    .from("workouts")
    .select("id,title,workout_type,source,started_at,duration_seconds,distance_meters,avg_hr")
    .in("id", [...new Set(links.map((link) => link.workout_id))]);
  if (workoutsError) throw workoutsError;

  const workoutById = new Map((workouts ?? []).map((workout) => [workout.id, workout]));
  const raceBySession = new Map(sessions.map((session) => [session.id, session.race_id as string]));
  const contexts: Record<string, unknown> = {};
  for (const link of links) {
    const raceId = raceBySession.get(link.planned_session_id);
    const workout = workoutById.get(link.workout_id);
    if (!raceId || !workout) continue;
    contexts[raceId] = {
      plannedSessionId: link.planned_session_id,
      title: workout.title || workout.workout_type || "Uhr-Aktivität",
      startedAt: workout.started_at,
      durationSeconds: workout.duration_seconds,
      distanceMeters: workout.distance_meters,
      avgHeartRate: workout.avg_hr,
      source: workout.source,
    };
  }
  return NextResponse.json(contexts);
}
