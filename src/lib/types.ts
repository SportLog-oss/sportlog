export interface DailyMetricRow {
  date: string;
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
  rampRate: number | null;
  dailyLoad: number | null;
  restingHr: number | null;
  hrv: number | null;
  weight: number | null;
  bodyFat: number | null;
  sleepDurationMin: number | null;
  sleepScore: number | null;
  readinessScore: number | null;
  recoveryScore: number | null;
  readinessScoreV2: number | null;
  readinessVerdict: "rest" | "easy" | "steady" | "go" | null;
  readinessDrivers: { factor: string; value: number }[];
  injuryRiskIndex: number | null;
  injuryRiskDrivers: string[];
  acwr: number | null;
  monotony: number | null;
  strainFoster: number | null;
  sportLoadSplit: Record<string, number>;
  hrvBaseline60d: number | null;
  hrvZScore: number | null;
  rhrBaseline60d: number | null;
  rhrZScore: number | null;
  sleepNeedMin: number | null;
  sleepDebtMin: number | null;
  anomalies: { metric: string; zScore: number; direction: "up" | "down" }[] | null;
}

export interface DailyMetricsCache {
  fetchedAt: string;
  period: string;
  rows: DailyMetricRow[];
}

export interface WeeklyVolume {
  week: string;
  hours: number;
  km: number;
  load: number;
  sessions: number;
  by_sport: Record<string, number>;
  by_sport_km: Record<string, number>;
}

export interface AnalyticsSummaryCache {
  fetchedAt: string;
  period: string;
  pmc: {
    current: { date: string; ctl: number; atl: number; tsb: number; rampRate: number };
    trend_7d: { ctl_change: number; atl_change: number; tsb_change: number };
    source: string;
  };
  weekly_volume: WeeklyVolume[];
  hr_zones: {
    total_hours: number;
    zones: Record<string, { hours: number; pct: number }>;
  };
  wellness: {
    hrv_avg: number;
    rhr_avg: number;
    sleep_avg_hours: number;
    latest_weight: number | null;
    days_tracked: number;
  };
}

export interface TrainingTrendsCache {
  fetchedAt: string;
  period: string;
  training: {
    total_sessions: number;
    total_duration_minutes: number;
    total_distance_km: number;
    sessions_by_type: Record<string, number>;
    avg_hr: number;
    week_over_week: {
      current_week_sessions: number;
      previous_week_sessions: number;
      current_week_duration_min: number;
      previous_week_duration_min: number;
    };
  };
  recovery: {
    hrv_values: { date: string; hrv: number }[];
    hrv_7day_avg: number;
    hrv_14day_avg: number;
    hrv_trend: "rising" | "declining" | "stable";
    rhr_values: { date: string; rhr: number }[];
    rhr_7day_avg: number;
    rhr_14day_avg: number;
    rhr_trend: "rising" | "declining" | "stable";
  };
  sleep: {
    avg_duration_hours: number;
    avg_score: number;
    nights_below_7h: number;
    nights_tracked: number;
  };
}

export interface InjuryRiskCache {
  fetchedAt: string;
  as_of: string;
  index: number;
  drivers: string[];
  contributors: {
    acwr: number;
    monotony: number;
    strain_foster: number;
    ramp_rate: number;
  };
  trend_14d: { date: string; index: number }[];
}

export interface AnomalyEntry {
  metric: string;
  zScore: number;
  direction: "up" | "down";
  date: string;
}

export interface AnomaliesCache {
  fetchedAt: string;
  period: string;
  count: number;
  anomalies: AnomalyEntry[];
}

export interface Activity {
  activityId: number;
  activityName: string;
  activityType: string;
  distanceInMeters: number;
  durationInSeconds: number;
  activeKilocalories: number;
  startTimeInSeconds: number;
  maxHeartRateInBeatsPerMinute?: number;
  averageHeartRateInBeatsPerMinute?: number;
  averageSpeedInMetersPerSecond?: number;
  averagePaceInMinutesPerKilometer?: number;
  totalElevationGainInMeters?: number;
  trainingLoad?: number;
  avgCadence?: number;
  intensityFactor?: number;
  efficiencyFactor?: number;
  avgPower?: number;
  normalizedPower?: number;
  maxPower?: number;
  maxSpeedInMetersPerSecond?: number;
  maxPaceInMinutesPerKilometer?: number;
  deviceName?: string;
  steps?: number;
  isWebUpload?: boolean;
  variabilityIndex?: number;
  aerobicDecouplingPct?: number;
  hrDriftPct?: number;
  tempC?: number;
  humidityPct?: number;
  windKph?: number;
  weatherAdjustedPower?: number;
  avgGroundContactMs?: number;
  avgVerticalOscCm?: number;
  avgStrideLengthM?: number;
  rpe?: number;
  feel?: number;
  totalVolume?: number;
  totalSets?: number;
  hrZones?: { z1: number; z2: number; z3: number; z4: number; z5: number };
  notes?: string;
}

export interface ActivitiesCache {
  fetchedAt: string;
  activities: Activity[];
}

export interface PowerProfileEntry {
  rating: "weak" | "moderate" | "strong";
  ratio: number;
  reference_range: [number, number];
}

export interface PerformanceEstimatesCache {
  fetchedAt: string;
  ftp_watts: number;
  running: {
    thresholdPaceSecPerKm: number;
    raceEquivalents: Record<string, number>;
  };
  power_profile: {
    ratios: Record<string, number>;
    profile: Record<string, PowerProfileEntry>;
    archetype: string;
    strengths: string[];
    limiters: string[];
  };
  power_zones: { zone: string; name: string; low_watts: number; high_watts: number | null }[];
}

export interface CurvePoint {
  durationSec: number;
  bestValue: number;
  paceDisplay?: string;
}

export interface CurvesCache {
  fetchedAt: string;
  power: { sport: string; points: CurvePoint[] };
  pace: { sport: string; points: CurvePoint[] };
}

export type CompetitionResult = {
  id: string;
  status: "planned" | "completed";
  name: string;
  date: string;
  location: string;
  distanceMeters: number;
  boatClass: string;
  crew: string;
  goal: string;
  result: string;
  placement: number | null;
  splits: { split: string; time: string }[];
  avgHeartRate: number | null;
  weather: string;
  wind: string;
  notes: string;
  analysis: string | null;
  createdAt: string;
  races: CompetitionRace[];
};

export type CompetitionRaceStatus = "planned" | "completed" | "dns" | "dnf" | "dsq" | "cancelled";
export type CompetitionRaceType = "time_trial" | "heat" | "repechage" | "quarterfinal" | "semifinal" | "final" | "other";

export type CompetitionRace = {
  id: string;
  competitionId: string;
  raceType: CompetitionRaceType;
  label: string;
  scheduledAt: string | null;
  distanceMeters: number;
  boatClass: string;
  crew: string;
  status: CompetitionRaceStatus;
  officialTimeSeconds: number | null;
  placement: number | null;
  fieldSize: number | null;
  resultSource: string;
  resultSourceUrl: string;
  legacyResultText: string;
  splits: { split: string; time: string }[];
  avgHeartRate: number | null;
  weather: string;
  wind: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type CalendarEventSource = "apple" | "google";

/**
 * Read-only calendar context (Kalenderkontext V1). Never created by the
 * user in SportLog itself — mirrors what AthleteData exposes from Apple
 * Calendar and Google Calendar so the plan can show conflicts and free
 * time without turning a personal appointment into training data.
 */
export type CalendarEvent = {
  id: string;
  source: CalendarEventSource;
  externalEventId: string;
  calendarName: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  /** Marked as "free"/available by the user — an FYI, not a firm block. */
  isFree: boolean;
  isCanceled: boolean;
  selfIsOrganizer: boolean | null;
  selfIsAttendee: boolean | null;
  selfResponse: string | null;
  lastSyncedAt: string;
};

export type Goal = {
  id: string;
  title: string;
  category: "wettkampf" | "leistung" | "kraft" | "umfang" | "sonstiges";
  targetDate: string;
  metricLabel: string;
  targetValue: number | null;
  unit: string;
  currentValue: number | null;
  performanceKind: string | null;
  currentValueSource?: "performance_best" | "manual" | null;
  linkedPerformanceDate?: string | null;
  notes: string;
  achieved: boolean;
  createdAt: string;
};

export type StrengthSet = {
  weightKg: number | null;
  reps: number | null;
};

export type StrengthExerciseLog = {
  name: string;
  sets: StrengthSet[];
};

export type StrengthSession = {
  id: string;
  date: string;
  title: string;
  activityId?: number;
  exercises: StrengthExerciseLog[];
  notes: string;
  createdAt: string;
};

export type BenchmarkKind = "time" | "weight" | "power" | "distance";

export type BenchmarkEntry = {
  date: string;
  value: number;
  notes: string;
};

export type Benchmark = {
  id: string;
  name: string;
  kind: BenchmarkKind;
  unit: string;
  lowerIsBetter: boolean;
  entries: BenchmarkEntry[];
  createdAt: string;
};

export type ActivityNote = {
  activityId: number;
  note: string;
  updatedAt: string;
};

// Automatically detected records (Batch E) — kept separate from the manually-entered Benchmark
// above. `category` values match PersonalBestCategory in src/lib/personalBests.ts.
export type PersonalBest = {
  id: string;
  category: string;
  value: number;
  workoutId: string | null;
  achievedAt: string;
  previousValue: number | null;
  previousAchievedAt: string | null;
};

export type IllnessLogEntry = {
  id: string;
  startDate: string;
  endDate: string | null;
  symptoms: string[];
  medications: string[];
  doctorVisits: boolean;
  trainingPausedFrom: string | null;
  trainingPausedUntil: string | null;
  returnedToTrainingOn: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type TrainingLogEntry = {
  id: string;
  activityId: number;
  date: string;
  pain: { bodyPart: string; intensity: number }[];
  injury: boolean;
  soreness: number | null;
  rpe: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type MentalHealthCheckinType = "emotion" | "mood";

export type MentalHealthCheckin = {
  id: string;
  timestamp: string;
  type: MentalHealthCheckinType;
  /** -1 (sehr unangenehm) .. 1 (sehr angenehm) */
  valence: number;
  emotionTags: string[];
  influenceTags: string[];
  note: string;
  createdAt: string;
  /** 0-10 scale, only set on type==='mood' (the daily check-in) — null on ad-hoc 'emotion' logs. */
  motivation: number | null;
  stress: number | null;
  energy: number | null;
  sleepQuality: number | null;
};

export interface ActivitySeriesPoint {
  /** Seconds elapsed since activity start */
  t: number;
  heartRate: number | null;
  speedKmh: number | null;
  altitudeM: number | null;
  cadence: number | null;
  power: number | null;
  distanceKm: number | null;
  paceSecondsPerKm: number | null;
  rowingPaceSecondsPer500: number | null;
  strokeDistanceM: number | null;
  temperatureC: number | null;
  groundContactTimeMs: number | null;
  verticalOscillationCm: number | null;
  strideLengthM: number | null;
  verticalRatioPct: number | null;
}

export type ActivityStatistic = {
  key: string;
  label: string;
  value: string;
};

export type ActivityStatisticSection = {
  key: string;
  title: string;
  items: ActivityStatistic[];
};

export type ActivityDetails = {
  hasDetails: boolean;
  statistics: ActivityStatisticSection[];
  overviewMetrics: ActivityStatistic[];
  hrZones: Activity["hrZones"] | null;
  hrZonesSource: string | null;
  importedLog: ImportedTrainingLogData;
  laps: {
    index: number;
    intensity: string;
    trigger: string;
    duration: string;
    distance: string;
    paceOrSpeed: string;
    hrAvg: number | null;
    hrMax: number | null;
    cadenceAvg: number | null;
    cadenceMax: number | null;
    powerW: number | null;
    ascentM: number | null;
    descentM: number | null;
  }[];
  series: ActivitySeriesPoint[];
};

export type ImportedTrainingLogData = {
  source: "Garmin / AthleteData";
  rpe: number | null;
  feel: number | null;
  items: ActivityStatistic[];
};

// "log-pain" and "log-training" both ultimately point at the same Trainingsprotokoll form (see
// TrainingLogSection) — there's no separate pain-only entry screen — but they fire under
// different conditions (see src/lib/reminders.ts): log-training nudges about *today's* unlogged
// activities, log-pain nudges to revisit a *previously reported* pain/injury that hasn't been
// followed up on in a few days.
export type ReminderType =
  | "log-training"
  | "log-pain"
  | "update-illness"
  | "log-mental-health"
  | "daily-checkin"
  | "new-activity";

export type ReminderPreferences = {
  enabledTypes: ReminderType[];
  /** UTC hour (0-23) at which the daily reminder cron may send a push */
  preferredHour: number;
  /** Date (YYYY-MM-DD) each reminder type was last sent, to avoid duplicate pushes per day */
  lastSent: Partial<Record<ReminderType, string>>;
};

export type Profile = {
  weightKg: number | null;
  hrRest: number | null;
  hrMax: number | null;
  vo2max: number | null;
  settings: Record<string, unknown>;
  ftpWatts: number | null;
  importedValues: Partial<Record<ProfileFieldName, ProfileImportedValue>>;
  fieldSources: Partial<Record<ProfileFieldName, "manual" | "Garmin / AthleteData">>;
};

export type ProfileFieldName = "weightKg" | "hrRest" | "hrMax" | "vo2max" | "ftpWatts";

export type ProfileImportedValue = {
  value: number;
  source: "Garmin / AthleteData";
  observedAt: string;
};

export type WeightEntry = {
  id: string;
  measuredOn: string;
  measuredAt: string;
  weightKg: number;
  source: "manual" | "athlete_data";
};

export type AthleteDataSyncStatus = {
  status: "never" | "syncing" | "success" | "partial" | "failed";
  trigger: "manual" | "cron" | "external_push" | null;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  completedAt: string | null;
  savedKeys: string[];
  failures: { key: string; error: string }[];
};

export type WorkoutSource = "garmin" | "concept2_ocr" | "manual";

/** A manually- or OCR-entered training session (source !== 'garmin'). Kept separate from the
 * numeric-Garmin-id-keyed Activity/getActivities() path — see docs/TASKS.md. */
export type Workout = {
  id: string;
  externalId: string | null;
  workoutType: string;
  source: WorkoutSource;
  startedAt: string;
  title: string | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  calories: number | null;
  avgHr: number | null;
  avgWatt: number | null;
  summaryText: string | null;
  importedRpe: number | null;
  importedFeel: number | null;
};
