import { getSupabaseForRequest } from "./supabaseClient";
import { addDays, type PlannedSession, type PlannedSessionInput, type PlannedSessionPatch, type PlanningWeek, type PlanningWeekType } from "@/lib/planning";

type PlanningRow = Record<string, unknown>;

export class PlanningReferenceError extends Error {}
export class PlanningConflictError extends Error {}

async function validateReferences(
  supabase: Awaited<ReturnType<typeof getSupabaseForRequest>>,
  input: Pick<PlannedSessionInput, "goalId" | "raceId">
) {
  for (const [id, type] of [[input.goalId, "goal"], [input.raceId, "race"]] as const) {
    if (!id) continue;
    const { data, error } = await supabase.from("goals_and_races").select("id").eq("id", id).eq("type", type).maybeSingle();
    if (error) throw error;
    if (!data) throw new PlanningReferenceError("Planning reference not found");
  }
}

function rowToSession(row: PlanningRow): PlannedSession {
  return {
    id: row.id as string,
    scheduledDate: row.scheduled_date as string,
    timeOfDay: (row.time_of_day as PlannedSession["timeOfDay"]) ?? null,
    scheduledAt: (row.scheduled_at as string) ?? null,
    sportType: row.sport_type as string,
    title: row.title as string,
    plannedDurationMin: row.planned_duration_min == null ? null : Number(row.planned_duration_min),
    plannedIntensity: (row.planned_intensity as PlannedSession["plannedIntensity"]) ?? null,
    description: (row.description as string) ?? "",
    technicalFocus: (row.technical_focus as string) ?? "",
    trainerNote: (row.trainer_note as string) ?? "",
    goalId: (row.goal_id as string) ?? null,
    raceId: (row.race_id as string) ?? null,
    status: row.status as PlannedSession["status"],
    changeReason: (row.change_reason as string) ?? null,
    movedFromDate: (row.moved_from_date as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function inputToRow(input: PlannedSessionInput | PlannedSessionPatch): PlanningRow {
  const mapping: Record<string, string> = {
    scheduledDate: "scheduled_date", timeOfDay: "time_of_day", scheduledAt: "scheduled_at", sportType: "sport_type",
    title: "title", plannedDurationMin: "planned_duration_min", plannedIntensity: "planned_intensity", description: "description",
    technicalFocus: "technical_focus", trainerNote: "trainer_note", goalId: "goal_id", raceId: "race_id", status: "status",
    changeReason: "change_reason",
  };
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined).map(([key, value]) => [mapping[key], value]));
}

function moveTimestampToDate(value: string | null, targetDate: string): string | null {
  if (!value) return null;
  const timePart = value.slice(10);
  return timePart ? `${targetDate}${timePart}` : null;
}

export async function getPlanningWeek(weekStart: string): Promise<PlanningWeek> {
  const supabase = await getSupabaseForRequest();
  const weekEnd = addDays(weekStart, 6);
  const [{ data: week, error: weekError }, { data: sessions, error: sessionsError }] = await Promise.all([
    supabase.from("planning_weeks").select("*").eq("week_start", weekStart).maybeSingle(),
    supabase.from("planned_sessions").select("*").gte("scheduled_date", weekStart).lte("scheduled_date", weekEnd).order("scheduled_date").order("scheduled_at"),
  ]);
  if (weekError) throw weekError;
  if (sessionsError) throw sessionsError;
  const mapped = (sessions ?? []).map((row) => rowToSession(row));
  return {
    weekStart,
    focus: week?.focus ?? "",
    weekType: (week?.week_type as PlanningWeekType) ?? "normal",
    notes: week?.notes ?? "",
    sessions: mapped,
    plannedDurationMin: mapped.reduce((total, session) => total + (session.status === "cancelled" ? 0 : session.plannedDurationMin ?? 0), 0),
  };
}

/** Same session shape as getPlanningWeek, but across an arbitrary date range instead of one
 * Monday-Sunday week — used for matching a Krankheit/Schmerzen-Eintrag to the sessions around it
 * (Konzept 005, Ergänzung 3), where the relevant window rarely aligns to a calendar week. */
export async function getPlannedSessionsInRange(startDate: string, endDate: string): Promise<PlannedSession[]> {
  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase
    .from("planned_sessions")
    .select("*")
    .gte("scheduled_date", startDate)
    .lte("scheduled_date", endDate)
    .order("scheduled_date");
  if (error) throw error;
  return (data ?? []).map(rowToSession);
}

export async function savePlanningWeek(input: { weekStart: string; focus?: string; weekType?: PlanningWeekType; notes?: string }) {
  const supabase = await getSupabaseForRequest();
  const { error } = await supabase.from("planning_weeks").upsert({
    week_start: input.weekStart, focus: input.focus ?? "", week_type: input.weekType ?? "normal", notes: input.notes ?? "", updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,week_start" });
  if (error) throw error;
  return getPlanningWeek(input.weekStart);
}

export async function createPlannedSession(input: PlannedSessionInput): Promise<PlannedSession> {
  const supabase = await getSupabaseForRequest();
  await validateReferences(supabase, input);
  const { data, error } = await supabase.from("planned_sessions").insert(inputToRow(input)).select("*").single();
  if (error) throw error;
  return rowToSession(data);
}

export async function updatePlannedSession(id: string, patch: PlannedSessionPatch): Promise<PlannedSession | null> {
  const supabase = await getSupabaseForRequest();
  await validateReferences(supabase, patch);
  const { data: before, error: beforeError } = await supabase.from("planned_sessions").select("*").eq("id", id).maybeSingle();
  if (beforeError) throw beforeError;
  if (!before) return null;
  const row: PlanningRow = { ...inputToRow(patch), updated_at: new Date().toISOString() };
  if (patch.scheduledDate && patch.scheduledDate !== before.scheduled_date) row.moved_from_date = before.moved_from_date ?? before.scheduled_date;
  const { data: after, error } = await supabase.from("planned_sessions").update(row).eq("id", id).select("*").single();
  if (error) throw error;
  return rowToSession(after);
}

export async function deletePlannedSession(id: string): Promise<boolean> {
  const supabase = await getSupabaseForRequest();
  const { data: before, error: beforeError } = await supabase.from("planned_sessions").select("*").eq("id", id).maybeSingle();
  if (beforeError) throw beforeError;
  if (!before) return false;
  const { error } = await supabase.from("planned_sessions").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function duplicatePlannedSession(id: string, scheduledDate?: string): Promise<PlannedSession | null> {
  const supabase = await getSupabaseForRequest();
  const { data: source, error: sourceError } = await supabase.from("planned_sessions").select("*").eq("id", id).maybeSingle();
  if (sourceError) throw sourceError;
  if (!source) return null;
  const targetDate = scheduledDate ?? source.scheduled_date;
  const { data, error } = await supabase.from("planned_sessions").insert({
    scheduled_date: targetDate,
    time_of_day: source.time_of_day,
    scheduled_at: moveTimestampToDate(source.scheduled_at, targetDate),
    sport_type: source.sport_type,
    title: source.title,
    planned_duration_min: source.planned_duration_min,
    planned_intensity: source.planned_intensity,
    description: source.description,
    technical_focus: source.technical_focus,
    trainer_note: source.trainer_note,
    goal_id: source.goal_id,
    race_id: source.race_id,
    status: "planned",
    change_reason: "Einheit dupliziert",
  }).select("*").single();
  if (error) throw error;
  return rowToSession(data);
}

export async function duplicatePlanningWeek(sourceWeekStart: string, targetWeekStart: string): Promise<PlanningWeek> {
  const supabase = await getSupabaseForRequest();
  const sourceWeekEnd = addDays(sourceWeekStart, 6);
  const targetWeekEnd = addDays(targetWeekStart, 6);
  const [{ data: sourceWeek, error: weekError }, { data: sourceSessions, error: sessionsError }, { count, error: targetError }] = await Promise.all([
    supabase.from("planning_weeks").select("*").eq("week_start", sourceWeekStart).maybeSingle(),
    supabase.from("planned_sessions").select("*").gte("scheduled_date", sourceWeekStart).lte("scheduled_date", sourceWeekEnd).neq("status", "cancelled").order("scheduled_date"),
    supabase.from("planned_sessions").select("id", { count: "exact", head: true }).gte("scheduled_date", targetWeekStart).lte("scheduled_date", targetWeekEnd),
  ]);
  if (weekError) throw weekError;
  if (sessionsError) throw sessionsError;
  if (targetError) throw targetError;
  if ((count ?? 0) > 0) throw new PlanningConflictError("Die Zielwoche enthält bereits Einheiten.");

  const { error: contextError } = await supabase.from("planning_weeks").upsert({
    week_start: targetWeekStart,
    focus: sourceWeek?.focus ?? "",
    week_type: sourceWeek?.week_type ?? "normal",
    notes: sourceWeek?.notes ?? "",
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,week_start" });
  if (contextError) throw contextError;

  const sessions = sourceSessions ?? [];
  if (sessions.length > 0) {
    const offsetDays = Math.round((new Date(`${targetWeekStart}T00:00:00Z`).getTime() - new Date(`${sourceWeekStart}T00:00:00Z`).getTime()) / 86_400_000);
    const rows = sessions.map((source) => {
      const targetDate = addDays(source.scheduled_date, offsetDays);
      return {
      scheduled_date: targetDate,
      time_of_day: source.time_of_day,
      scheduled_at: moveTimestampToDate(source.scheduled_at, targetDate),
      sport_type: source.sport_type,
      title: source.title,
      planned_duration_min: source.planned_duration_min,
      planned_intensity: source.planned_intensity,
      description: source.description,
      technical_focus: source.technical_focus,
      trainer_note: source.trainer_note,
      goal_id: source.goal_id,
      race_id: source.race_id,
      status: "planned",
      change_reason: `Woche vom ${sourceWeekStart} dupliziert`,
    }; });
    const { error: insertError } = await supabase.from("planned_sessions").insert(rows);
    if (insertError) throw insertError;
  }
  return getPlanningWeek(targetWeekStart);
}
