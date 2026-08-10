import type { PlanningIntensity, PlanningWorkoutMatch } from "@/lib/planning";

export type AdaptationSuggestion = { title: string; reason: string; durationFactor: number; intensity: PlanningIntensity };

export function adaptationFor(match: PlanningWorkoutMatch): AdaptationSuggestion | null {
  const log = match.postWorkoutLog;
  const maxPain = Math.max(0, ...(log?.pain.map((pain) => pain.intensity) ?? []));
  const soreness = log?.soreness ?? 0;
  const rpe = match.reflection?.perceivedExertion ?? match.workout.importedRpe ?? 0;
  if (log?.injury || maxPain >= 7) return { title: "Deutlich entlasten", reason: log?.injury ? "Verletzungsverdacht wurde markiert." : `Schmerzstärke ${maxPain}/10 wurde gemeldet.`, durationFactor: 0.5, intensity: "recovery" };
  if (soreness >= 7 || rpe >= 9) return { title: "Erholung priorisieren", reason: soreness >= 7 ? `Muskelkater ${soreness}/10 ist hoch.` : `Die Belastung lag bei RPE ${rpe}/10.`, durationFactor: 0.75, intensity: "easy" };
  if (maxPain >= 4 || soreness >= 5 || rpe >= 8) return { title: "Nächste Einheit leicht reduzieren", reason: maxPain >= 4 ? `Schmerzstärke ${maxPain}/10 wurde gemeldet.` : soreness >= 5 ? `Muskelkater liegt bei ${soreness}/10.` : `Die Belastung lag bei RPE ${rpe}/10.`, durationFactor: 0.9, intensity: "easy" };
  return null;
}
