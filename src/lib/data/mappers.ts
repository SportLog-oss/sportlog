// camelCase (app types, src/lib/types.ts) <-> snake_case (Postgres rows) translation, isolated
// here so store.ts stays focused on which table/query to hit. `user_id` is intentionally never
// set on insert/upsert payloads — every relevant column defaults to `auth.uid()` at the DB
// level, and RLS scopes every select to the caller's own rows, so no explicit userId threading
// is needed anywhere in this file or in store.ts.

import type {
  Activity,
  ActivityNote,
  Benchmark,
  BenchmarkEntry,
  CalendarEvent,
  CompetitionRace,
  CompetitionResult,
  Goal,
  IllnessLogEntry,
  MentalHealthCheckin,
  PersonalBest,
  Profile,
  ReminderPreferences,
  StrengthSession,
  TrainingLogEntry,
  WeightEntry,
  Workout,
} from "@/lib/types";

// ---------------------------------------------------------------------------------------------
// Goal / CompetitionResult <-> goals_and_races
// ---------------------------------------------------------------------------------------------

export function goalToRow(g: Goal) {
  return {
    id: g.id,
    type: "goal",
    title: g.title,
    category: g.category,
    target_date: g.targetDate,
    metric_label: g.metricLabel,
    target_value: g.targetValue,
    unit: g.unit,
    current_value: g.currentValue,
    performance_kind: g.performanceKind,
    notes: g.notes,
    is_completed: g.achieved,
    created_at: g.createdAt,
  };
}

export function rowToGoal(row: Record<string, unknown>): Goal {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    category: (row.category as Goal["category"]) ?? "sonstiges",
    targetDate: row.target_date as string,
    metricLabel: (row.metric_label as string) ?? "",
    targetValue: (row.target_value as number | null) ?? null,
    unit: (row.unit as string) ?? "",
    currentValue: (row.current_value as number | null) ?? null,
    performanceKind: (row.performance_kind as string | null) ?? null,
    notes: (row.notes as string) ?? "",
    achieved: Boolean(row.is_completed),
    createdAt: row.created_at as string,
  };
}

export function competitionToRow(c: CompetitionResult) {
  return {
    id: c.id,
    type: "race",
    title: c.name,
    target_date: c.date,
    is_completed: c.status === "completed",
    location: c.location,
    distance_meters: c.distanceMeters,
    boat_class: c.boatClass,
    crew: c.crew,
    goal_text: c.goal,
    result: c.result,
    placement: c.placement,
    splits: c.splits,
    avg_heart_rate: c.avgHeartRate,
    weather: c.weather,
    wind: c.wind,
    notes: c.notes,
    analysis: c.analysis,
    created_at: c.createdAt,
  };
}

export function rowToCompetition(row: Record<string, unknown>): CompetitionResult {
  return {
    id: row.id as string,
    status: row.is_completed ? "completed" : "planned",
    name: (row.title as string) ?? "",
    date: row.target_date as string,
    location: (row.location as string) ?? "",
    distanceMeters: (row.distance_meters as number) ?? 0,
    boatClass: (row.boat_class as string) ?? "",
    crew: (row.crew as string) ?? "",
    goal: (row.goal_text as string) ?? "",
    result: (row.result as string) ?? "",
    placement: (row.placement as number | null) ?? null,
    splits: (row.splits as { split: string; time: string }[]) ?? [],
    avgHeartRate: (row.avg_heart_rate as number | null) ?? null,
    weather: (row.weather as string) ?? "",
    wind: (row.wind as string) ?? "",
    notes: (row.notes as string) ?? "",
    analysis: (row.analysis as string | null) ?? null,
    createdAt: row.created_at as string,
    races: [],
  };
}

export function competitionRaceToRow(race: CompetitionRace) {
  return {
    id: race.id,
    competition_id: race.competitionId,
    race_type: race.raceType,
    label: race.label,
    scheduled_at: race.scheduledAt,
    distance_meters: race.distanceMeters,
    boat_class: race.boatClass,
    crew: race.crew,
    status: race.status,
    official_time_seconds: race.officialTimeSeconds,
    placement: race.placement,
    field_size: race.fieldSize,
    result_source: race.resultSource,
    result_source_url: race.resultSourceUrl,
    legacy_result_text: race.legacyResultText,
    splits: race.splits,
    avg_heart_rate: race.avgHeartRate,
    weather: race.weather,
    wind: race.wind,
    notes: race.notes,
    created_at: race.createdAt,
    updated_at: race.updatedAt,
  };
}

export function rowToCompetitionRace(row: Record<string, unknown>): CompetitionRace {
  return {
    id: row.id as string,
    competitionId: row.competition_id as string,
    raceType: row.race_type as CompetitionRace["raceType"],
    label: (row.label as string) ?? "",
    scheduledAt: (row.scheduled_at as string | null) ?? null,
    distanceMeters: Number(row.distance_meters ?? 2000),
    boatClass: (row.boat_class as string) ?? "",
    crew: (row.crew as string) ?? "",
    status: row.status as CompetitionRace["status"],
    officialTimeSeconds: row.official_time_seconds == null ? null : Number(row.official_time_seconds),
    placement: row.placement == null ? null : Number(row.placement),
    fieldSize: row.field_size == null ? null : Number(row.field_size),
    resultSource: (row.result_source as string) ?? "",
    resultSourceUrl: (row.result_source_url as string) ?? "",
    legacyResultText: (row.legacy_result_text as string) ?? "",
    splits: (row.splits as CompetitionRace["splits"]) ?? [],
    avgHeartRate: row.avg_heart_rate == null ? null : Number(row.avg_heart_rate),
    weather: (row.weather as string) ?? "",
    wind: (row.wind as string) ?? "",
    notes: (row.notes as string) ?? "",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ---------------------------------------------------------------------------------------------
// StrengthSession <-> strength_sessions
// ---------------------------------------------------------------------------------------------

export function strengthSessionToRow(s: StrengthSession) {
  return {
    id: s.id,
    date: s.date,
    title: s.title,
    activity_id: s.activityId ?? null,
    exercises: s.exercises,
    notes: s.notes,
    created_at: s.createdAt,
  };
}

export function rowToStrengthSession(row: Record<string, unknown>): StrengthSession {
  return {
    id: row.id as string,
    date: row.date as string,
    title: (row.title as string) ?? "Krafttraining",
    activityId: (row.activity_id as number | undefined) ?? undefined,
    exercises: (row.exercises as StrengthSession["exercises"]) ?? [],
    notes: (row.notes as string) ?? "",
    createdAt: row.created_at as string,
  };
}

// ---------------------------------------------------------------------------------------------
// Benchmark <-> benchmarks (+ benchmark_entries, mapped separately since entries have no id)
// ---------------------------------------------------------------------------------------------

export function benchmarkToRow(b: Benchmark) {
  return {
    id: b.id,
    name: b.name,
    kind: b.kind,
    unit: b.unit,
    lower_is_better: b.lowerIsBetter,
    created_at: b.createdAt,
  };
}

export function rowToBenchmark(row: Record<string, unknown>, entries: BenchmarkEntry[]): Benchmark {
  return {
    id: row.id as string,
    name: row.name as string,
    kind: row.kind as Benchmark["kind"],
    unit: (row.unit as string) ?? "",
    lowerIsBetter: Boolean(row.lower_is_better),
    entries,
    createdAt: row.created_at as string,
  };
}

export function benchmarkEntryToRow(e: BenchmarkEntry, benchmarkId: string) {
  return { benchmark_id: benchmarkId, date: e.date, value: e.value, notes: e.notes };
}

export function rowToBenchmarkEntry(row: Record<string, unknown>): BenchmarkEntry {
  return { date: row.date as string, value: Number(row.value), notes: (row.notes as string) ?? "" };
}

// ---------------------------------------------------------------------------------------------
// ActivityNote <-> activity_notes (no own id — natural key is activity_id)
// ---------------------------------------------------------------------------------------------

export function activityNoteToRow(n: ActivityNote) {
  return { activity_id: n.activityId, note: n.note, updated_at: n.updatedAt };
}

export function rowToActivityNote(row: Record<string, unknown>): ActivityNote {
  return { activityId: row.activity_id as number, note: (row.note as string) ?? "", updatedAt: row.updated_at as string };
}

// ---------------------------------------------------------------------------------------------
// PersonalBest <-> personal_bests (row values are always plain numbers, never formatted strings)
// ---------------------------------------------------------------------------------------------

export function rowToPersonalBest(row: Record<string, unknown>): PersonalBest {
  return {
    id: row.id as string,
    category: row.category as string,
    value: Number(row.value),
    workoutId: (row.workout_id as string) ?? null,
    achievedAt: row.achieved_at as string,
    previousValue: row.previous_value === null || row.previous_value === undefined ? null : Number(row.previous_value),
    previousAchievedAt: (row.previous_achieved_at as string) ?? null,
  };
}

// ---------------------------------------------------------------------------------------------
// IllnessLogEntry <-> illness_log
// ---------------------------------------------------------------------------------------------

export function illnessLogEntryToRow(e: IllnessLogEntry) {
  return {
    id: e.id,
    start_date: e.startDate,
    end_date: e.endDate,
    symptoms: e.symptoms,
    medications: e.medications,
    doctor_visits: e.doctorVisits,
    training_paused_from: e.trainingPausedFrom,
    training_paused_until: e.trainingPausedUntil,
    returned_to_training_on: e.returnedToTrainingOn,
    notes: e.notes,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}

export function rowToIllnessLogEntry(row: Record<string, unknown>): IllnessLogEntry {
  return {
    id: row.id as string,
    startDate: row.start_date as string,
    endDate: (row.end_date as string | null) ?? null,
    symptoms: (row.symptoms as string[]) ?? [],
    medications: (row.medications as string[]) ?? [],
    doctorVisits: Boolean(row.doctor_visits),
    trainingPausedFrom: (row.training_paused_from as string | null) ?? null,
    trainingPausedUntil: (row.training_paused_until as string | null) ?? null,
    returnedToTrainingOn: (row.returned_to_training_on as string | null) ?? null,
    notes: (row.notes as string) ?? "",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ---------------------------------------------------------------------------------------------
// TrainingLogEntry <-> training_log_entries (natural key: activity_id, one per activity)
// ---------------------------------------------------------------------------------------------

export function trainingLogEntryToRow(e: TrainingLogEntry) {
  return {
    id: e.id,
    activity_id: e.activityId,
    date: e.date,
    pain: e.pain,
    injury: e.injury,
    soreness: e.soreness,
    rpe: e.rpe,
    notes: e.notes,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}

export function rowToTrainingLogEntry(row: Record<string, unknown>): TrainingLogEntry {
  return {
    id: row.id as string,
    activityId: row.activity_id as number,
    date: row.date as string,
    pain: (row.pain as TrainingLogEntry["pain"]) ?? [],
    injury: Boolean(row.injury),
    soreness: (row.soreness as number | null) ?? null,
    rpe: (row.rpe as number | null) ?? null,
    notes: (row.notes as string) ?? "",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ---------------------------------------------------------------------------------------------
// MentalHealthCheckin <-> mental_health_checkins
// ---------------------------------------------------------------------------------------------

export function mentalHealthCheckinToRow(c: MentalHealthCheckin) {
  return {
    id: c.id,
    timestamp: c.timestamp,
    type: c.type,
    valence: c.valence,
    emotion_tags: c.emotionTags,
    influence_tags: c.influenceTags,
    note: c.note,
    created_at: c.createdAt,
    motivation: c.motivation,
    stress: c.stress,
    energy: c.energy,
    sleep_quality: c.sleepQuality,
  };
}

export function rowToMentalHealthCheckin(row: Record<string, unknown>): MentalHealthCheckin {
  return {
    id: row.id as string,
    timestamp: row.timestamp as string,
    type: row.type as MentalHealthCheckin["type"],
    valence: Number(row.valence),
    emotionTags: (row.emotion_tags as string[]) ?? [],
    influenceTags: (row.influence_tags as string[]) ?? [],
    note: (row.note as string) ?? "",
    createdAt: row.created_at as string,
    motivation: (row.motivation as number | null) ?? null,
    stress: (row.stress as number | null) ?? null,
    energy: (row.energy as number | null) ?? null,
    sleepQuality: (row.sleep_quality as number | null) ?? null,
  };
}

// ---------------------------------------------------------------------------------------------
// ReminderPreferences <-> reminder_preferences (singleton per user)
// ---------------------------------------------------------------------------------------------

export function reminderPreferencesToRow(p: ReminderPreferences) {
  return { enabled_types: p.enabledTypes, preferred_hour: p.preferredHour, last_sent: p.lastSent };
}

export function rowToReminderPreferences(row: Record<string, unknown>): ReminderPreferences {
  return {
    enabledTypes: (row.enabled_types as ReminderPreferences["enabledTypes"]) ?? [],
    preferredHour: (row.preferred_hour as number) ?? 19,
    lastSent: (row.last_sent as ReminderPreferences["lastSent"]) ?? {},
  };
}

// ---------------------------------------------------------------------------------------------
// Activity <-> workouts (source='garmin')
// ---------------------------------------------------------------------------------------------

export function activityToWorkoutRow(a: Activity) {
  return {
    // `id` deliberately omitted — see store.ts's saveActivities(): the upsert conflict target
    // is (source, external_id), and omitting id keeps an existing row's id/FKs stable across re-syncs.
    workout_type: a.activityType,
    source: "garmin",
    external_id: String(a.activityId),
    started_at: new Date(a.startTimeInSeconds * 1000).toISOString(),
    title: a.activityName,
    duration_seconds: a.durationInSeconds,
    distance_meters: a.distanceInMeters,
    calories: a.activeKilocalories,
    avg_hr: a.averageHeartRateInBeatsPerMinute ?? null,
    avg_watt: a.avgPower ?? null,
    summary_text: a.notes ?? null,
    raw_telemetry: {
      maxHeartRateInBeatsPerMinute: a.maxHeartRateInBeatsPerMinute,
      averageSpeedInMetersPerSecond: a.averageSpeedInMetersPerSecond,
      averagePaceInMinutesPerKilometer: a.averagePaceInMinutesPerKilometer,
      totalElevationGainInMeters: a.totalElevationGainInMeters,
      trainingLoad: a.trainingLoad,
      avgCadence: a.avgCadence,
      intensityFactor: a.intensityFactor,
      efficiencyFactor: a.efficiencyFactor,
      normalizedPower: a.normalizedPower,
      maxPower: a.maxPower,
      maxSpeedInMetersPerSecond: a.maxSpeedInMetersPerSecond,
      maxPaceInMinutesPerKilometer: a.maxPaceInMinutesPerKilometer,
      deviceName: a.deviceName,
      steps: a.steps,
      isWebUpload: a.isWebUpload,
      variabilityIndex: a.variabilityIndex,
      aerobicDecouplingPct: a.aerobicDecouplingPct,
      hrDriftPct: a.hrDriftPct,
      tempC: a.tempC,
      humidityPct: a.humidityPct,
      windKph: a.windKph,
      weatherAdjustedPower: a.weatherAdjustedPower,
      avgGroundContactMs: a.avgGroundContactMs,
      avgVerticalOscCm: a.avgVerticalOscCm,
      avgStrideLengthM: a.avgStrideLengthM,
      rpe: a.rpe,
      feel: a.feel,
      totalVolume: a.totalVolume,
      totalSets: a.totalSets,
      hrZones: a.hrZones,
    },
  };
}

export function rowToActivity(row: Record<string, unknown>): Activity {
  const telemetry = (row.raw_telemetry as Record<string, unknown>) ?? {};
  return {
    activityId: Number(row.external_id),
    activityName: (row.title as string) ?? "",
    activityType: row.workout_type as string,
    distanceInMeters: (row.distance_meters as number) ?? 0,
    durationInSeconds: (row.duration_seconds as number) ?? 0,
    activeKilocalories: (row.calories as number) ?? 0,
    startTimeInSeconds: Math.floor(new Date(row.started_at as string).getTime() / 1000),
    maxHeartRateInBeatsPerMinute: telemetry.maxHeartRateInBeatsPerMinute as number | undefined,
    averageHeartRateInBeatsPerMinute: (row.avg_hr as number | undefined) ?? undefined,
    averageSpeedInMetersPerSecond: telemetry.averageSpeedInMetersPerSecond as number | undefined,
    averagePaceInMinutesPerKilometer: telemetry.averagePaceInMinutesPerKilometer as number | undefined,
    totalElevationGainInMeters: telemetry.totalElevationGainInMeters as number | undefined,
    trainingLoad: telemetry.trainingLoad as number | undefined,
    avgCadence: telemetry.avgCadence as number | undefined,
    intensityFactor: telemetry.intensityFactor as number | undefined,
    efficiencyFactor: telemetry.efficiencyFactor as number | undefined,
    avgPower: (row.avg_watt as number | undefined) ?? undefined,
    normalizedPower: telemetry.normalizedPower as number | undefined,
    maxPower: telemetry.maxPower as number | undefined,
    maxSpeedInMetersPerSecond: telemetry.maxSpeedInMetersPerSecond as number | undefined,
    maxPaceInMinutesPerKilometer: telemetry.maxPaceInMinutesPerKilometer as number | undefined,
    deviceName: telemetry.deviceName as string | undefined,
    steps: telemetry.steps as number | undefined,
    isWebUpload: telemetry.isWebUpload as boolean | undefined,
    variabilityIndex: telemetry.variabilityIndex as number | undefined,
    aerobicDecouplingPct: telemetry.aerobicDecouplingPct as number | undefined,
    hrDriftPct: telemetry.hrDriftPct as number | undefined,
    tempC: telemetry.tempC as number | undefined,
    humidityPct: telemetry.humidityPct as number | undefined,
    windKph: telemetry.windKph as number | undefined,
    weatherAdjustedPower: telemetry.weatherAdjustedPower as number | undefined,
    avgGroundContactMs: telemetry.avgGroundContactMs as number | undefined,
    avgVerticalOscCm: telemetry.avgVerticalOscCm as number | undefined,
    avgStrideLengthM: telemetry.avgStrideLengthM as number | undefined,
    rpe: telemetry.rpe as number | undefined,
    feel: telemetry.feel as number | undefined,
    totalVolume: telemetry.totalVolume as number | undefined,
    totalSets: telemetry.totalSets as number | undefined,
    hrZones: telemetry.hrZones as Activity["hrZones"],
    notes: (row.summary_text as string | undefined) ?? undefined,
  };
}

// ---------------------------------------------------------------------------------------------
// Workout (manual/OCR entries) <-> workouts
// ---------------------------------------------------------------------------------------------

export function rowToWorkout(row: Record<string, unknown>): Workout {
  const telemetry = (row.raw_telemetry as Record<string, unknown>) ?? {};
  return {
    id: row.id as string,
    externalId: (row.external_id as string | null) ?? null,
    workoutType: row.workout_type as string,
    source: row.source as Workout["source"],
    startedAt: row.started_at as string,
    title: (row.title as string | null) ?? null,
    durationSeconds: (row.duration_seconds as number | null) ?? null,
    distanceMeters: (row.distance_meters as number | null) ?? null,
    calories: (row.calories as number | null) ?? null,
    avgHr: (row.avg_hr as number | null) ?? null,
    avgWatt: (row.avg_watt as number | null) ?? null,
    summaryText: (row.summary_text as string | null) ?? null,
    importedRpe: telemetry.rpe == null ? null : Number(telemetry.rpe),
    importedFeel: telemetry.feel == null ? null : Number(telemetry.feel),
  };
}

// ---------------------------------------------------------------------------------------------
// Profile <-> profiles
// ---------------------------------------------------------------------------------------------

export function rowToProfile(row: Record<string, unknown>): Profile {
  const settings = (row.settings as Record<string, unknown>) ?? {};
  const masterData = (settings.athleteDataMasterData as Record<string, unknown> | undefined) ?? {};
  const importedValues =
    (masterData.imported as Profile["importedValues"] | undefined) ?? {};
  const fieldSources = {
    ...((masterData.selectedSources as Profile["fieldSources"] | undefined) ?? {}),
  };
  if (row.weight_kg != null && !fieldSources.weightKg) fieldSources.weightKg = "manual";
  if (row.hr_rest != null && !fieldSources.hrRest) fieldSources.hrRest = "manual";
  if (row.hr_max != null && !fieldSources.hrMax) fieldSources.hrMax = "manual";
  if (row.vo2max != null && !fieldSources.vo2max) fieldSources.vo2max = "manual";
  const selectedFtp = fieldSources.ftpWatts === "Garmin / AthleteData" ? importedValues.ftpWatts?.value ?? null : null;
  return {
    weightKg: (row.weight_kg as number | null) ?? null,
    hrRest: (row.hr_rest as number | null) ?? null,
    hrMax: (row.hr_max as number | null) ?? null,
    vo2max: (row.vo2max as number | null) ?? null,
    settings,
    ftpWatts: selectedFtp,
    importedValues,
    fieldSources,
  };
}

export function profileToRow(p: Partial<Profile>) {
  const row: Record<string, unknown> = {};
  if (p.weightKg !== undefined) row.weight_kg = p.weightKg;
  if (p.hrRest !== undefined) row.hr_rest = p.hrRest;
  if (p.hrMax !== undefined) row.hr_max = p.hrMax;
  if (p.vo2max !== undefined) row.vo2max = p.vo2max;
  if (p.settings !== undefined) row.settings = p.settings;
  return row;
}

// ---------------------------------------------------------------------------------------------
// WeightEntry <-> weight_log
// ---------------------------------------------------------------------------------------------

export function rowToWeightEntry(row: Record<string, unknown>): WeightEntry {
  return {
    id: row.id as string,
    measuredOn: row.measured_on as string,
    measuredAt: row.measured_at as string,
    weightKg: Number(row.weight_kg),
    source: row.source as WeightEntry["source"],
  };
}

// ---------------------------------------------------------------------------------------------
// CalendarEvent <-> calendar_events
// ---------------------------------------------------------------------------------------------

export function rowToCalendarEvent(row: Record<string, unknown>): CalendarEvent {
  return {
    id: row.id as string,
    source: row.source as CalendarEvent["source"],
    externalEventId: row.external_event_id as string,
    calendarName: (row.calendar_name as string) ?? "",
    title: (row.title as string) ?? "",
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
    allDay: Boolean(row.all_day),
    isFree: Boolean(row.is_free),
    isCanceled: Boolean(row.is_canceled),
    selfIsOrganizer: (row.self_is_organizer as boolean | null) ?? null,
    selfIsAttendee: (row.self_is_attendee as boolean | null) ?? null,
    selfResponse: (row.self_response as string | null) ?? null,
    lastSyncedAt: row.last_synced_at as string,
  };
}

export function calendarEventToRow(e: Omit<CalendarEvent, "id">) {
  return {
    source: e.source,
    external_event_id: e.externalEventId,
    calendar_name: e.calendarName,
    title: e.title,
    starts_at: e.startsAt,
    ends_at: e.endsAt,
    all_day: e.allDay,
    is_free: e.isFree,
    is_canceled: e.isCanceled,
    self_is_organizer: e.selfIsOrganizer,
    self_is_attendee: e.selfIsAttendee,
    self_response: e.selfResponse,
    last_synced_at: e.lastSyncedAt,
    updated_at: e.lastSyncedAt,
  };
}
