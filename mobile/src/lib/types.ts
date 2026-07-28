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
  readinessVerdict: string | null;
  injuryRiskIndex: number | null;
  injuryRiskDrivers: string[];
  acwr: number | null;
  monotony: number | null;
  strainFoster: number | null;
  hrvBaseline60d: number | null;
  hrvZScore: number | null;
  rhrBaseline60d: number | null;
  rhrZScore: number | null;
  sleepNeedMin: number | null;
  sleepDebtMin: number | null;
}

export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface Explanation {
  headline: string;
  body: string;
  sentiment: Sentiment;
  recommendation: string;
}

export interface Warning {
  level: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
}

export interface Goal {
  id: string;
  title: string;
  category: 'wettkampf' | 'leistung' | 'kraft' | 'umfang' | 'sonstiges';
  targetDate: string;
  metricLabel: string;
  targetValue: number | null;
  unit: string;
  currentValue: number | null;
  notes: string;
  achieved: boolean;
  createdAt: string;
}

export interface CompetitionResult {
  id: string;
  status: 'planned' | 'completed';
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
}

export interface StrengthSet {
  weightKg: number | null;
  reps: number | null;
}

export interface StrengthExerciseLog {
  name: string;
  sets: StrengthSet[];
}

export interface StrengthSession {
  id: string;
  date: string;
  title: string;
  activityId?: number;
  exercises: StrengthExerciseLog[];
  notes: string;
  createdAt: string;
}

export type BenchmarkKind = 'time' | 'weight' | 'power' | 'distance';

export interface BenchmarkEntry {
  date: string;
  value: number;
  notes: string;
}

export interface Benchmark {
  id: string;
  name: string;
  kind: BenchmarkKind;
  unit: string;
  lowerIsBetter: boolean;
  entries: BenchmarkEntry[];
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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

export interface WeeklyVolume {
  week: string;
  hours: number;
  km: number;
  load: number;
  sessions: number;
  by_sport: Record<string, number>;
}

export interface CurvePoint {
  durationSec: number;
  bestValue: number;
  paceDisplay?: string;
}

export interface ReadinessFactor {
  label: string;
  value: string;
  tone: Sentiment;
}

export interface DashboardResponse {
  fetchedAt: string;
  stats: {
    recoveryPct: number | null;
    strain: number;
    sleepPerformance: number | null;
  };
  recommendation: string;
  warnings: Warning[];
  goals: Goal[];
  competitions: CompetitionResult[];
}

export interface TrainingResponse {
  activities: Activity[];
  weeklyVolume: WeeklyVolume[];
  hrZones: { total_hours: number; zones: Record<string, { hours: number; pct: number }> };
  performance: {
    ftp_watts: number;
    power_profile: { archetype: string; strengths: string[]; limiters: string[] };
  };
  curves: {
    power: { points: CurvePoint[] };
    pace: { points: CurvePoint[] };
  };
}

export interface HealthResponse {
  rows: DailyMetricRow[];
  trends: {
    sleep: { avg_duration_hours: number; avg_score: number; nights_below_7h: number; nights_tracked: number };
    recovery: {
      hrv_trend: string;
      hrv_values: { date: string; hrv: number }[];
      rhr_trend: string;
      rhr_values: { date: string; rhr: number }[];
    };
  };
  injuryRisk: {
    index: number;
    drivers: string[];
    contributors: { acwr: number; monotony: number; strain_foster: number; ramp_rate: number };
    trend_14d: { date: string; index: number }[];
  };
  explanations: {
    sleep: Explanation;
    injuryRisk: Explanation;
    hrv: Explanation;
    rhr: Explanation;
    load: Explanation;
    readiness: Explanation;
  };
  readinessFactors: ReadinessFactor[];
}
