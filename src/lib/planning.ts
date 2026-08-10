import { z } from "zod";

export const PLANNING_INTENSITIES = ["recovery", "easy", "moderate", "hard", "competition"] as const;
export const PLANNING_STATUSES = ["planned", "completed", "changed", "cancelled", "moved"] as const;
export const PLANNING_TIMES_OF_DAY = ["morning", "midday", "afternoon", "evening", "custom"] as const;
export const PLANNING_WEEK_TYPES = ["normal", "regeneration", "pause", "competition"] as const;

export const planningDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum muss YYYY-MM-DD entsprechen").refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Ungültiges Datum");

const optionalText = z.string().trim().max(4000).optional();
const optionalNullableText = z.string().trim().max(4000).nullable().optional();

export const weekStartSchema = planningDateSchema.refine((value) => new Date(`${value}T00:00:00Z`).getUTCDay() === 1, "Wochenstart muss ein Montag sein");

export const planningWeekInputSchema = z.object({
  weekStart: weekStartSchema,
  focus: z.string().trim().max(500).optional(),
  weekType: z.enum(PLANNING_WEEK_TYPES).optional(),
  notes: optionalText,
}).strict();

export const plannedSessionCreateSchema = z.object({
  scheduledDate: planningDateSchema,
  timeOfDay: z.enum(PLANNING_TIMES_OF_DAY).nullable().optional(),
  scheduledAt: z.iso.datetime({ offset: true }).nullable().optional(),
  sportType: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  plannedDurationMin: z.number().int().min(1).max(1440).nullable().optional(),
  plannedIntensity: z.enum(PLANNING_INTENSITIES).nullable().optional(),
  description: optionalText,
  technicalFocus: optionalText,
  trainerNote: optionalText,
  goalId: z.uuid().nullable().optional(),
  raceId: z.uuid().nullable().optional(),
}).strict();

export const plannedSessionPatchSchema = plannedSessionCreateSchema.partial().extend({
  status: z.enum(PLANNING_STATUSES).optional(),
  changeReason: optionalNullableText,
}).strict().refine((value) => Object.keys(value).length > 0, "Mindestens ein Feld muss geändert werden");

export const plannedSessionDuplicateSchema = z.object({
  scheduledDate: planningDateSchema.optional(),
}).strict();

export const planningWeekDuplicateSchema = z.object({
  sourceWeekStart: weekStartSchema,
  targetWeekStart: weekStartSchema,
}).strict().refine((value) => value.sourceWeekStart !== value.targetWeekStart, "Quell- und Zielwoche müssen verschieden sein");

export type PlanningIntensity = (typeof PLANNING_INTENSITIES)[number];
export type PlanningStatus = (typeof PLANNING_STATUSES)[number];
export type PlanningTimeOfDay = (typeof PLANNING_TIMES_OF_DAY)[number];
export type PlanningWeekType = (typeof PLANNING_WEEK_TYPES)[number];
export type PlannedSessionInput = z.infer<typeof plannedSessionCreateSchema>;
export type PlannedSessionPatch = z.infer<typeof plannedSessionPatchSchema>;

export type PlannedSession = {
  id: string;
  scheduledDate: string;
  timeOfDay: PlanningTimeOfDay | null;
  scheduledAt: string | null;
  sportType: string;
  title: string;
  plannedDurationMin: number | null;
  plannedIntensity: PlanningIntensity | null;
  description: string;
  technicalFocus: string;
  trainerNote: string;
  goalId: string | null;
  raceId: string | null;
  status: PlanningStatus;
  changeReason: string | null;
  movedFromDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlanningWeek = {
  weekStart: string;
  focus: string;
  weekType: PlanningWeekType;
  notes: string;
  sessions: PlannedSession[];
  plannedDurationMin: number;
};

export type PlanningMatchStatus = "suggested" | "confirmed" | "rejected";
export type TrainingFeeling = "great" | "good" | "okay" | "hard" | "bad";
export type TrainingDeviationReason = "felt-good" | "felt-tired" | "schedule" | "conditions" | "plan-adjustment" | "other";
export type TrainingReflection = {
  feeling: TrainingFeeling | null;
  perceivedExertion: number | null;
  deviationReason: TrainingDeviationReason | null;
  note: string;
  updatedAt: string;
};
export type PlanningWorkoutMatch = {
  plannedSessionId: string;
  workoutId: string;
  status: PlanningMatchStatus;
  score: number;
  reasons: string[];
  reflection: TrainingReflection | null;
  postWorkoutLog: {
    pain: { bodyPart: string; intensity: number }[];
    injury: boolean;
    soreness: number | null;
  } | null;
  workout: {
    externalId: string | null;
    title: string;
    workoutType: string;
    source: string;
    startedAt: string;
    durationSeconds: number | null;
    distanceMeters: number | null;
    importedRpe: number | null;
    importedFeel: number | null;
  };
};

export const planningMatchInputSchema = z.object({
  workoutId: z.uuid(),
  status: z.enum(["confirmed", "rejected"]),
  score: z.number().min(0).max(1).optional(),
  reasons: z.array(z.string().trim().min(1).max(200)).max(10).optional(),
}).strict();

export const trainingReflectionInputSchema = z.object({
  feeling: z.enum(["great", "good", "okay", "hard", "bad"]).nullable(),
  perceivedExertion: z.number().int().min(1).max(10).nullable(),
  deviationReason: z.enum(["felt-good", "felt-tired", "schedule", "conditions", "plan-adjustment", "other"]).nullable(),
  note: z.string().trim().max(1000),
}).strict().refine((value) => value.feeling !== null || value.perceivedExertion !== null || value.deviationReason !== null || value.note.length > 0, "Mindestens eine Reflexionseingabe ist erforderlich");

export function planningError(error: z.ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) fields[issue.path.join(".") || "input"] = issue.message;
  return { error: { code: "INVALID_PLANNING_INPUT", message: "Die Planungsdaten sind ungültig.", fields } };
}

export function mondayForDate(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const isoDay = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - isoDay + 1);
  return date.toISOString().slice(0, 10);
}

export function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
