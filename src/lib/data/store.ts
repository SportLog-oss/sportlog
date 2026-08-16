import type {
  ActivitiesCache,
  AthleteDataSyncStatus,
  ActivityNote,
  AnalyticsSummaryCache,
  AnomaliesCache,
  Benchmark,
  ChatSession,
  CompetitionResult,
  CurvesCache,
  DailyMetricsCache,
  Goal,
  IllnessLogEntry,
  InjuryRiskCache,
  MentalHealthCheckin,
  PerformanceEstimatesCache,
  PersistedChatMessage,
  PersonalBest,
  Profile,
  ProfileFieldName,
  ProfileImportedValue,
  ReminderPreferences,
  StrengthSession,
  TrainingLogEntry,
  TrainingTrendsCache,
  WeightEntry,
  Workout,
  WorkoutSource,
} from "@/lib/types";
import { getSupabaseForRequest } from "./supabaseClient";
import { syncCollection } from "./collectionSync";
import { type PersonalBestCategory, isBetterPersonalBest } from "@/lib/personalBests";
import {
  activityNoteToRow,
  activityToWorkoutRow,
  benchmarkEntryToRow,
  benchmarkToRow,
  chatMessageToRow,
  chatSessionToRow,
  competitionToRow,
  goalToRow,
  illnessLogEntryToRow,
  mentalHealthCheckinToRow,
  profileToRow,
  reminderPreferencesToRow,
  rowToActivity,
  rowToActivityNote,
  rowToBenchmark,
  rowToBenchmarkEntry,
  rowToChatMessage,
  rowToChatSession,
  rowToCompetition,
  rowToCompetitionRace,
  rowToGoal,
  rowToIllnessLogEntry,
  rowToMentalHealthCheckin,
  rowToPersonalBest,
  rowToProfile,
  rowToReminderPreferences,
  rowToStrengthSession,
  rowToTrainingLogEntry,
  rowToWeightEntry,
  rowToWorkout,
  strengthSessionToRow,
  trainingLogEntryToRow,
} from "./mappers";

// ===============================================================================================
// Read-only analytics/cache blobs, synced daily from the external AthleteData/Garmin service.
// All 8 keys are written uniformly by src/lib/sync.ts's saveCacheEntry() calls; "activities" is
// special-cased below to land in `workouts` instead of `app_cache`, since individual activities
// need to be real, queryable rows (personal_bests.workout_id references them).
// ===============================================================================================

async function getCache<T>(cacheKey: string): Promise<T> {
  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase.from("app_cache").select("data").eq("cache_key", cacheKey).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Keine gecachten Daten für "${cacheKey}" — bitte zuerst synchronisieren.`);
  return data.data as T;
}

export async function saveCacheEntry(cacheKey: string, data: unknown) {
  const supabase = await getSupabaseForRequest();

  if (cacheKey === "activities") {
    const { fetchedAt, activities } = data as ActivitiesCache;
    if (activities.length) {
      const { error } = await supabase
        .from("workouts")
        .upsert(activities.map(activityToWorkoutRow), { onConflict: "user_id,source,external_id" });
      if (error) throw error;
    }
    const { error: metaError } = await supabase.from("app_cache").upsert(
      { cache_key: "activities", data: { fetchedAt }, fetched_at: fetchedAt, updated_at: new Date().toISOString() },
      { onConflict: "user_id,cache_key" }
    );
    if (metaError) throw metaError;
    return;
  }

  const fetchedAt = (data as { fetchedAt?: string } | null)?.fetchedAt ?? null;
  const { error } = await supabase.from("app_cache").upsert(
    { cache_key: cacheKey, data, fetched_at: fetchedAt, updated_at: new Date().toISOString() },
    { onConflict: "user_id,cache_key" }
  );
  if (error) throw error;

  if (cacheKey === "daily-metrics") {
    const weightRows = (data as DailyMetricsCache).rows
      .filter((row) => row.weight !== null)
      .map((row) => ({
        measured_on: row.date,
        measured_at: `${row.date}T12:00:00.000Z`,
        weight_kg: row.weight,
        source: "athlete_data",
      }));
    if (weightRows.length) {
      const { error: weightError } = await supabase
        .from("weight_log")
        .upsert(weightRows, { onConflict: "user_id,source,measured_on" });
      if (weightError) throw weightError;
    }
  }
}

export function getDailyMetrics(): Promise<DailyMetricsCache> {
  return getCache("daily-metrics");
}

export function getAnalyticsSummary(): Promise<AnalyticsSummaryCache> {
  return getCache("analytics-summary");
}

export function getTrainingTrends(): Promise<TrainingTrendsCache> {
  return getCache("training-trends");
}

export function getInjuryRisk(): Promise<InjuryRiskCache> {
  return getCache("injury-risk");
}

export function getAnomalies(): Promise<AnomaliesCache> {
  return getCache("anomalies");
}

export async function getActivities(): Promise<ActivitiesCache> {
  const supabase = await getSupabaseForRequest();
  const [{ data: rows, error: rowsError }, { data: meta }] = await Promise.all([
    supabase.from("workouts").select("*").eq("source", "garmin").order("started_at", { ascending: false }),
    supabase.from("app_cache").select("data").eq("cache_key", "activities").maybeSingle(),
  ]);
  if (rowsError) throw rowsError;
  const fetchedAt = (meta?.data as { fetchedAt?: string } | undefined)?.fetchedAt ?? new Date().toISOString();
  return { fetchedAt, activities: (rows ?? []).map(rowToActivity) };
}

export function getPerformanceEstimates(): Promise<PerformanceEstimatesCache> {
  return getCache("performance-estimates");
}

export function getCurves(): Promise<CurvesCache> {
  return getCache("curves");
}

export function getCachedActivityDetails(activityId: string): Promise<{ fetchedAt: string; details: unknown }> {
  return getCache(`activity-details:${activityId}`);
}

export function saveCachedActivityDetails(activityId: string, details: unknown) {
  return saveCacheEntry(`activity-details:${activityId}`, {
    fetchedAt: new Date().toISOString(),
    details,
  });
}

export async function getCacheFreshness(): Promise<{ fetchedAt: string; staleDays: number }> {
  const { fetchedAt } = await getDailyMetrics();
  const staleDays = Math.floor((Date.now() - new Date(fetchedAt).getTime()) / 86_400_000);
  return { fetchedAt, staleDays };
}

const NEVER_SYNCED: AthleteDataSyncStatus = {
  status: "never",
  trigger: null,
  lastAttemptAt: null,
  lastSuccessAt: null,
  completedAt: null,
  savedKeys: [],
  failures: [],
};

export async function getAthleteDataSyncStatus(): Promise<AthleteDataSyncStatus> {
  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase.from("athlete_data_sync_status").select("*").maybeSingle();
  if (error) throw error;
  if (!data) return NEVER_SYNCED;
  return {
    status: data.status as AthleteDataSyncStatus["status"],
    trigger: (data.trigger as AthleteDataSyncStatus["trigger"]) ?? null,
    lastAttemptAt: data.last_attempt_at ?? null,
    lastSuccessAt: data.last_success_at ?? null,
    completedAt: data.completed_at ?? null,
    savedKeys: data.saved_keys ?? [],
    failures: (data.failures as AthleteDataSyncStatus["failures"]) ?? [],
  };
}

export async function startAthleteDataSync(trigger: NonNullable<AthleteDataSyncStatus["trigger"]>) {
  const supabase = await getSupabaseForRequest();
  const now = new Date().toISOString();
  const { error } = await supabase.from("athlete_data_sync_status").upsert(
    {
      status: "syncing",
      trigger,
      last_attempt_at: now,
      completed_at: null,
      saved_keys: [],
      failures: [],
      updated_at: now,
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export async function finishAthleteDataSync(
  savedKeys: string[],
  failures: AthleteDataSyncStatus["failures"]
) {
  const supabase = await getSupabaseForRequest();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const now = new Date().toISOString();
  const status: AthleteDataSyncStatus["status"] =
    failures.length === 0 ? "success" : savedKeys.length > 0 ? "partial" : "failed";
  const patch: Record<string, unknown> = {
    status,
    completed_at: now,
    saved_keys: savedKeys,
    failures,
    updated_at: now,
  };
  if (savedKeys.length > 0) patch.last_success_at = now;

  const { error } = await supabase.from("athlete_data_sync_status").update(patch).eq("user_id", user.id);
  if (error) throw error;
}

// ===============================================================================================
// Goals & Competitions — both live in goals_and_races, discriminated by `type`.
// ===============================================================================================

export async function getGoals(): Promise<Goal[]> {
  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase.from("goals_and_races").select("*").eq("type", "goal").order("created_at");
  if (error) throw error;
  return (data ?? []).map(rowToGoal);
}

export async function saveGoals(goals: Goal[]) {
  const supabase = await getSupabaseForRequest();
  await syncCollection(supabase, "goals_and_races", goals.map(goalToRow), { scope: { type: "goal" } });
}

export async function getCompetitions(): Promise<CompetitionResult[]> {
  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase.from("goals_and_races").select("*").eq("type", "race").order("created_at");
  if (error) throw error;
  const competitions = (data ?? []).map(rowToCompetition);
  if (competitions.length === 0) return competitions;

  const { data: raceRows, error: raceError } = await supabase
    .from("competition_races")
    .select("*")
    .in("competition_id", competitions.map((competition) => competition.id))
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (raceError) throw raceError;

  const racesByCompetition = new Map<string, ReturnType<typeof rowToCompetitionRace>[]>();
  for (const row of raceRows ?? []) {
    const race = rowToCompetitionRace(row);
    const races = racesByCompetition.get(race.competitionId) ?? [];
    races.push(race);
    racesByCompetition.set(race.competitionId, races);
  }
  return competitions.map((competition) => ({
    ...competition,
    races: racesByCompetition.get(competition.id) ?? [],
  }));
}

export async function saveCompetitions(competitions: CompetitionResult[]) {
  const supabase = await getSupabaseForRequest();
  await syncCollection(supabase, "goals_and_races", competitions.map(competitionToRow), { scope: { type: "race" } });
}

// ===============================================================================================
// Strength sessions, benchmarks, illness log, mental health, training log, chat, reminders
// ===============================================================================================

export async function getStrengthSessions(): Promise<StrengthSession[]> {
  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase.from("strength_sessions").select("*").order("date");
  if (error) throw error;
  return (data ?? []).map(rowToStrengthSession);
}

export async function saveStrengthSessions(sessions: StrengthSession[]) {
  const supabase = await getSupabaseForRequest();
  await syncCollection(supabase, "strength_sessions", sessions.map(strengthSessionToRow));
}

export async function getBenchmarks(): Promise<Benchmark[]> {
  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase
    .from("benchmarks")
    .select("*, benchmark_entries(date,value,notes)")
    .order("created_at", { ascending: true })
    .order("date", { referencedTable: "benchmark_entries", ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const entries = ((row.benchmark_entries as Record<string, unknown>[]) ?? []).map(rowToBenchmarkEntry);
    return rowToBenchmark(row, entries);
  });
}

export async function saveBenchmarks(benchmarks: Benchmark[]) {
  const supabase = await getSupabaseForRequest();
  await syncCollection(supabase, "benchmarks", benchmarks.map(benchmarkToRow));

  // Entries have no independent id in the app's data model, so each benchmark's entries are
  // replaced wholesale rather than diffed — simpler and correct given the small data volume here.
  for (const b of benchmarks) {
    const { error: delError } = await supabase.from("benchmark_entries").delete().eq("benchmark_id", b.id);
    if (delError) throw delError;
    if (b.entries.length) {
      const { error: insError } = await supabase
        .from("benchmark_entries")
        .insert(b.entries.map((e) => benchmarkEntryToRow(e, b.id)));
      if (insError) throw insError;
    }
  }
}

// ===============================================================================================
// Personal bests — automatically detected records, kept separate from the manually-entered
// benchmarks/benchmark_entries above. Detection logic lives in src/lib/personalBests.ts; this is
// just the persistence side (upsert-if-better + read).
// ===============================================================================================

export async function getPersonalBests(): Promise<PersonalBest[]> {
  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase.from("personal_bests").select("*").order("category");
  if (error) throw error;
  return (data ?? []).map(rowToPersonalBest);
}

// Upserts a candidate only if it's a genuine improvement over the stored record for that category
// (or there is no record yet) — the improvement direction comes from PB_CATEGORY_META, never from
// comparing formatted strings. One row per (user, category): re-running this for the same category
// updates the existing row instead of accumulating duplicates, and the row that's about to be
// overwritten is preserved as previous_value/previous_achieved_at so the UI can still show what
// was broken after the fact.
export async function upsertPersonalBestIfBetter(
  category: PersonalBestCategory,
  value: number,
  activityId: number
): Promise<{ improved: boolean }> {
  const supabase = await getSupabaseForRequest();

  const { data: existing, error: existingError } = await supabase
    .from("personal_bests")
    .select("value, achieved_at")
    .eq("category", category)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing && !isBetterPersonalBest(category, value, Number(existing.value))) {
    return { improved: false };
  }

  const { data: workoutRow, error: workoutError } = await supabase
    .from("workouts")
    .select("id")
    .eq("source", "garmin")
    .eq("external_id", String(activityId))
    .maybeSingle();
  if (workoutError) throw workoutError;

  const { error: upsertError } = await supabase.from("personal_bests").upsert(
    {
      category,
      value,
      workout_id: workoutRow?.id ?? null,
      achieved_at: new Date().toISOString(),
      previous_value: existing ? Number(existing.value) : null,
      previous_achieved_at: existing?.achieved_at ?? null,
    },
    { onConflict: "user_id,category" }
  );
  if (upsertError) throw upsertError;

  return { improved: true };
}

export async function getActivityNotes(): Promise<ActivityNote[]> {
  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase.from("activity_notes").select("*");
  if (error) throw error;
  return (data ?? []).map(rowToActivityNote);
}

export async function saveActivityNotes(notes: ActivityNote[]) {
  const supabase = await getSupabaseForRequest();
  if (!notes.length) return;
  const { error } = await supabase
    .from("activity_notes")
    .upsert(notes.map(activityNoteToRow), { onConflict: "user_id,activity_id" });
  if (error) throw error;
}

export async function getIllnessLog(): Promise<IllnessLogEntry[]> {
  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase.from("illness_log").select("*").order("start_date");
  if (error) throw error;
  return (data ?? []).map(rowToIllnessLogEntry);
}

export async function saveIllnessLog(entries: IllnessLogEntry[]) {
  const supabase = await getSupabaseForRequest();
  await syncCollection(supabase, "illness_log", entries.map(illnessLogEntryToRow));
}

export async function getTrainingLogEntries(): Promise<TrainingLogEntry[]> {
  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase.from("training_log_entries").select("*");
  if (error) throw error;
  return (data ?? []).map(rowToTrainingLogEntry);
}

export async function saveTrainingLogEntries(entries: TrainingLogEntry[]) {
  const supabase = await getSupabaseForRequest();
  if (!entries.length) return;
  const { error } = await supabase
    .from("training_log_entries")
    .upsert(entries.map(trainingLogEntryToRow), { onConflict: "user_id,activity_id" });
  if (error) throw error;
}

export async function getMentalHealthCheckins(): Promise<MentalHealthCheckin[]> {
  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase.from("mental_health_checkins").select("*").order("timestamp");
  if (error) throw error;
  return (data ?? []).map(rowToMentalHealthCheckin);
}

export async function saveMentalHealthCheckins(checkins: MentalHealthCheckin[]) {
  const supabase = await getSupabaseForRequest();
  await syncCollection(supabase, "mental_health_checkins", checkins.map(mentalHealthCheckinToRow));
}

export async function getChatSessions(): Promise<ChatSession[]> {
  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase.from("chat_sessions").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToChatSession);
}

export async function saveChatSessions(sessions: ChatSession[]) {
  const supabase = await getSupabaseForRequest();
  await syncCollection(supabase, "chat_sessions", sessions.map(chatSessionToRow));
}

export async function getChatMessages(chatId: string): Promise<PersistedChatMessage[]> {
  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase.from("chat_messages").select("*").eq("chat_id", chatId).order("created_at");
  if (error) throw error;
  return (data ?? []).map(rowToChatMessage);
}

export async function saveChatMessages(chatId: string, messages: PersistedChatMessage[]) {
  const supabase = await getSupabaseForRequest();
  if (!messages.length) return;
  const { error } = await supabase.from("chat_messages").upsert(messages.map(chatMessageToRow), { onConflict: "id" });
  if (error) throw error;
}

export async function deleteChatMessages(chatId: string) {
  const supabase = await getSupabaseForRequest();
  const { error } = await supabase.from("chat_messages").delete().eq("chat_id", chatId);
  if (error) throw error;
}

const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  enabledTypes: ["log-training", "log-pain", "update-illness", "log-mental-health", "daily-checkin", "new-activity"],
  preferredHour: 19,
  lastSent: {},
};

export async function getReminderPreferences(): Promise<ReminderPreferences> {
  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase.from("reminder_preferences").select("*").maybeSingle();
  if (error) throw error;
  return data ? rowToReminderPreferences(data) : DEFAULT_REMINDER_PREFERENCES;
}

export async function saveReminderPreferences(prefs: ReminderPreferences) {
  const supabase = await getSupabaseForRequest();
  const { error } = await supabase
    .from("reminder_preferences")
    .upsert({ ...reminderPreferencesToRow(prefs), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function claimActivityPush(externalId: string, activityId: number): Promise<boolean> {
  const supabase = await getSupabaseForRequest();
  const { error } = await supabase.from("activity_push_notifications").insert({
    external_id: externalId,
    activity_id: activityId,
    status: "claimed",
  });
  if (!error) return true;
  if (error.code === "23505") return false;
  throw error;
}

export async function finishActivityPush(externalId: string): Promise<void> {
  const supabase = await getSupabaseForRequest();
  const { error } = await supabase
    .from("activity_push_notifications")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("external_id", externalId);
  if (error) throw error;
}

export async function releaseActivityPush(externalId: string): Promise<void> {
  const supabase = await getSupabaseForRequest();
  const { error } = await supabase
    .from("activity_push_notifications")
    .delete()
    .eq("external_id", externalId)
    .eq("status", "claimed");
  if (error) throw error;
}

// ===============================================================================================
// Manual/OCR training entries (new) — deliberately separate from the Garmin-id-keyed
// getActivities() path above. See docs/TASKS.md for why this doesn't merge with Activity.
// ===============================================================================================

export async function getWorkouts(source?: WorkoutSource): Promise<Workout[]> {
  const supabase = await getSupabaseForRequest();
  let query = supabase.from("workouts").select("*").order("started_at", { ascending: false });
  if (source) query = query.eq("source", source);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(rowToWorkout);
}

export async function createWorkout(input: Omit<Workout, "id" | "externalId" | "importedRpe" | "importedFeel">): Promise<Workout> {
  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase
    .from("workouts")
    .insert({
      workout_type: input.workoutType,
      source: input.source,
      started_at: input.startedAt,
      title: input.title,
      duration_seconds: input.durationSeconds,
      distance_meters: input.distanceMeters,
      calories: input.calories,
      avg_hr: input.avgHr,
      avg_watt: input.avgWatt,
      summary_text: input.summaryText,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToWorkout(data);
}

export async function deleteWorkout(id: string): Promise<void> {
  const supabase = await getSupabaseForRequest();
  const { error } = await supabase.from("workouts").delete().eq("id", id).neq("source", "garmin");
  if (error) throw error;
}

// ===============================================================================================
// Athlete profile (Stammdaten)
// ===============================================================================================

export async function getProfile(): Promise<Profile> {
  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase.from("profiles").select("*").single();
  if (error) throw error;
  return rowToProfile(data);
}

export async function updateProfile(patch: Partial<Profile>): Promise<Profile> {
  const supabase = await getSupabaseForRequest();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("profiles")
    .update(profileToRow(patch))
    .eq("id", user.id)
    .select()
    .single();
  if (error) throw error;
  return rowToProfile(data);
}

export async function saveImportedProfileValues(
  values: Partial<Record<ProfileFieldName, ProfileImportedValue>>
): Promise<Profile> {
  const current = await getProfile();
  const masterData =
    (current.settings.athleteDataMasterData as Record<string, unknown> | undefined) ?? {};
  return updateProfile({
    settings: {
      ...current.settings,
      athleteDataMasterData: {
        ...masterData,
        imported: {
          ...((masterData.imported as Profile["importedValues"] | undefined) ?? {}),
          ...values,
        },
      },
    },
  });
}

export async function getWeightEntries(limit = 365): Promise<WeightEntry[]> {
  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase
    .from("weight_log")
    .select("*")
    .order("measured_on", { ascending: false })
    .order("measured_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(rowToWeightEntry).reverse();
}

export async function recordWeight(
  weightKg: number,
  measuredOn: string,
  measuredAt = new Date().toISOString()
): Promise<WeightEntry> {
  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase
    .rpc("record_weight", {
      p_weight_kg: weightKg,
      p_measured_on: measuredOn,
      p_measured_at: measuredAt,
    })
    .single();
  if (error) throw error;
  return rowToWeightEntry(data as Record<string, unknown>);
}
