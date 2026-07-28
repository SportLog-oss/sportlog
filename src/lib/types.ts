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

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
