import type {
  PlannedSession,
  PlanningIntensity,
  PlanningWeekType,
  PlanningWorkoutMatch,
  TrainingDeviationReason,
  TrainingFeeling,
  TrainingReflection,
} from "./planning";
import type { CompetitionResult } from "./types";

export const WEEK_TYPES: { value: PlanningWeekType; label: string }[] = [
  { value: "normal", label: "Normale Woche" },
  { value: "regeneration", label: "Regeneration" },
  { value: "pause", label: "Pause" },
  { value: "competition", label: "Wettkampf" },
];

export const INTENSITIES: { value: PlanningIntensity; label: string; color: string }[] = [
  { value: "recovery", label: "Regeneration", color: "bg-sky-400" },
  { value: "easy", label: "Locker", color: "bg-positive" },
  { value: "moderate", label: "Moderat", color: "bg-warning" },
  { value: "hard", label: "Hart", color: "bg-orange-400" },
  { value: "competition", label: "Wettkampf", color: "bg-fuchsia-400" },
];

export const SPORT_OPTIONS = [
  "Rudern",
  "Laufen",
  "Radfahren",
  "Krafttraining",
  "Schwimmen",
  "Mobilität",
  "Regeneration",
  "Sonstiges",
];

export type SessionDraft = {
  id?: string;
  scheduledDate: string;
  title: string;
  sportType: string;
  plannedDurationMin: string;
  plannedIntensity: PlanningIntensity | "";
  timeOfDay: "morning" | "midday" | "afternoon" | "evening" | "custom";
  description: string;
};

const LOAD_FACTORS: Record<PlanningIntensity, number> = {
  recovery: 0.35,
  easy: 0.55,
  moderate: 0.75,
  hard: 1,
  competition: 1.15,
};

export function emptySessionDraft(date: string): SessionDraft {
  return {
    scheduledDate: date,
    title: "",
    sportType: "Rudern",
    plannedDurationMin: "",
    plannedIntensity: "easy",
    timeOfDay: "afternoon",
    description: "",
  };
}

export function planningDateLabel(date: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", options);
}

export function planningMinutesLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} h${rest ? ` ${rest} min` : ""}` : `${rest} min`;
}

export function trainingFeelingFromScore(value: number | null): TrainingFeeling | null {
  if (value === null) return null;
  if (value >= 80) return "great";
  if (value >= 60) return "good";
  if (value >= 40) return "okay";
  if (value >= 20) return "hard";
  return "bad";
}

/**
 * Baut den Ausgangsentwurf einer Reflexion aus einer Plan-Ist-Zuordnung.
 * Bevorzugt eine bereits gespeicherte Reflexion; fällt sonst auf die von
 * Garmin importierten Werte zurück. Reine Fachlogik aus WeekPlanner.openReflection
 * ausgelagert, damit sie unabhängig von React getestet werden kann.
 */
export function buildReflectionDraft(
  match: Pick<PlanningWorkoutMatch, "plannedSessionId" | "workoutId" | "workout">,
  saved: TrainingReflection | null,
): {
  plannedSessionId: string;
  workoutId: string;
  feeling: TrainingFeeling | "";
  perceivedExertion: string;
  deviationReason: TrainingDeviationReason | "";
  note: string;
} {
  return saved
    ? {
        plannedSessionId: match.plannedSessionId,
        workoutId: match.workoutId,
        feeling: saved.feeling ?? trainingFeelingFromScore(match.workout.importedFeel) ?? "",
        perceivedExertion: (saved.perceivedExertion ?? match.workout.importedRpe)?.toString() ?? "",
        deviationReason: saved.deviationReason ?? "",
        note: saved.note,
      }
    : {
        plannedSessionId: match.plannedSessionId,
        workoutId: match.workoutId,
        feeling: trainingFeelingFromScore(match.workout.importedFeel) ?? "",
        perceivedExertion: match.workout.importedRpe?.toString() ?? "",
        deviationReason: "",
        note: "",
      };
}

/**
 * Baut den API-Payload beim Speichern einer Reflexion. Von Garmin importierte
 * Werte (RPE, Trainingsgefühl) haben Vorrang vor der freien Eingabe, damit
 * schreibgeschützte Uhr-Werte nicht durch veraltete Formularwerte überschrieben
 * werden. Reine Fachlogik aus WeekPlanner.saveReflection ausgelagert.
 */
export function buildReflectionPayload(
  draft: { feeling: TrainingFeeling | ""; perceivedExertion: string; deviationReason: TrainingDeviationReason | ""; note: string },
  imported: { rpe: number | null; feel: number | null },
) {
  return {
    feeling: trainingFeelingFromScore(imported.feel) ?? (draft.feeling || null),
    perceivedExertion: imported.rpe ?? (draft.perceivedExertion ? Number(draft.perceivedExertion) : null),
    deviationReason: draft.deviationReason || null,
    note: draft.note,
  };
}

/**
 * Baut den API-Payload zum Anlegen der Regatta-Veranstaltung aus dem
 * Formularentwurf. Reine Fachlogik aus WeekPlanner.saveRegatta ausgelagert.
 */
export function buildRegattaCompetitionPayload(draft: {
  name: string;
  date: string;
  location: string;
  distanceMeters: string;
  boatClass: string;
  crew: string;
  goal: string;
}) {
  return { ...draft, distanceMeters: Number(draft.distanceMeters) || 2000, status: "planned" as const };
}

/**
 * Baut den API-Payload für die Wettkampf-Einheit, mit der eine neu angelegte
 * Regatta automatisch im Trainingsplan verknüpft wird. Reine Fachlogik aus
 * WeekPlanner.saveRegatta ausgelagert.
 */
export function buildRegattaSessionPayload(
  competition: Pick<CompetitionResult, "id" | "date" | "name" | "location" | "distanceMeters" | "goal">,
) {
  return {
    scheduledDate: competition.date,
    title: competition.name,
    sportType: "Regatta",
    plannedDurationMin: null,
    plannedIntensity: "competition" as const,
    timeOfDay: "custom" as const,
    description: [competition.location, competition.distanceMeters ? `${competition.distanceMeters} m` : "", competition.goal].filter(Boolean).join(" · "),
    raceId: competition.id,
  };
}

/**
 * Baut den API-Payload zum Bestätigen oder Ablehnen einer Plan-Ist-Zuordnung.
 * Reine Fachlogik aus WeekPlanner.decideMatch ausgelagert.
 */
export function buildMatchDecisionPayload(
  match: Pick<PlanningWorkoutMatch, "workoutId" | "score" | "reasons">,
  status: "confirmed" | "rejected",
) {
  return { workoutId: match.workoutId, status, score: match.score, reasons: match.reasons };
}

export function buildPlanningDayLoads(days: string[], sessions: PlannedSession[]) {
  const activeSessions = sessions.filter((session) => session.status !== "cancelled");

  return days.map((day) => {
    const daySessions = activeSessions.filter((session) => session.scheduledDate === day);
    const score = daySessions.reduce(
      (sum, session) =>
        sum +
        (session.plannedDurationMin ?? 45) *
          (session.plannedIntensity ? LOAD_FACTORS[session.plannedIntensity] : 0.6),
      0,
    );
    const strongest = daySessions.reduce<PlanningIntensity | null>((current, session) => {
      if (!session.plannedIntensity) return current;
      if (!current || LOAD_FACTORS[session.plannedIntensity] > LOAD_FACTORS[current]) {
        return session.plannedIntensity;
      }
      return current;
    }, null);

    return { day, score, sessions: daySessions.length, strongest };
  });
}
