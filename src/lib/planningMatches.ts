import type { PlannedSession, PlanningWorkoutMatch } from "@/lib/planning";
import type { Workout } from "@/lib/types";

const SPORT_GROUPS: Record<string, string[]> = {
  rowing: ["ruder", "rowing", "indoor_rowing"],
  running: ["lauf", "running", "walk", "walking"],
  cycling: ["rad", "cycling", "bike"],
  strength: ["kraft", "strength", "weight"],
  swimming: ["schwimm", "swimming"],
  mobility: ["mobil", "yoga", "stretch"],
};

function sportGroup(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-zäöüß0-9]+/g, "_");
  return Object.entries(SPORT_GROUPS).find(([, terms]) => terms.some((term) => normalized.includes(term)))?.[0] ?? normalized;
}

function dateDistance(a: string, b: string) {
  return Math.abs(Math.round((new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime()) / 86_400_000));
}

export function scorePlanningMatch(session: PlannedSession, workout: Workout): Pick<PlanningWorkoutMatch, "score" | "reasons"> {
  const workoutDate = workout.startedAt.slice(0, 10);
  const distance = dateDistance(session.scheduledDate, workoutDate);
  let score = distance === 0 ? 0.55 : distance === 1 ? 0.25 : 0;
  const reasons = [distance === 0 ? "Gleicher Trainingstag" : distance === 1 ? "Benachbarter Trainingstag" : "Abweichender Trainingstag"];
  if (sportGroup(session.sportType) === sportGroup(workout.workoutType)) { score += 0.3; reasons.push("Passende Sportart"); }
  if (session.plannedDurationMin && workout.durationSeconds) {
    const difference = Math.abs(session.plannedDurationMin - workout.durationSeconds / 60) / session.plannedDurationMin;
    if (difference <= 0.15) { score += 0.15; reasons.push("Sehr ähnliche Dauer"); }
    else if (difference <= 0.35) { score += 0.08; reasons.push("Ähnliche Dauer"); }
  }
  return { score: Math.min(1, Math.round(score * 100) / 100), reasons };
}

export function buildMatchSuggestion(session: PlannedSession, workout: Workout): PlanningWorkoutMatch {
  const scored = scorePlanningMatch(session, workout);
  return {
    plannedSessionId: session.id, workoutId: workout.id, status: "suggested", ...scored,
    reflection: null,
    postWorkoutLog: null,
    workout: { externalId: workout.externalId, title: workout.title ?? workout.workoutType, workoutType: workout.workoutType, source: workout.source, startedAt: workout.startedAt, durationSeconds: workout.durationSeconds, distanceMeters: workout.distanceMeters, importedRpe: workout.importedRpe, importedFeel: workout.importedFeel },
  };
}
