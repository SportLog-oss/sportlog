import fs from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";
import type {
  ActivitiesCache,
  ActivityNote,
  AnalyticsSummaryCache,
  AnomaliesCache,
  Benchmark,
  CompetitionResult,
  CurvesCache,
  DailyMetricsCache,
  Goal,
  InjuryRiskCache,
  PerformanceEstimatesCache,
  StrengthSession,
  TrainingTrendsCache,
} from "@/lib/types";

const DATA_ROOT = path.join(process.cwd(), "data");
const CACHE_DIR = path.join(DATA_ROOT, "cache");
const USER_DIR = path.join(DATA_ROOT, "user");

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// On Vercel the filesystem is read-only at runtime, so anything that needs to be
// updated after deploy — user-editable data (goals, competitions) AND the athlete's
// real training/health snapshot — is persisted in Upstash Redis when configured.
// The health snapshot in particular must never live in the (public) git repo, so
// the daily sync writes straight to Redis via /api/sync instead of committing files.
// Locally, without those env vars, everything falls back to the JSON files under
// data/cache/ and data/user/ for convenience.
const redis =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
    : null;

async function getCache<T>(redisKey: string, filename: string): Promise<T> {
  if (redis) {
    const cached = await redis.get<T>(`cache:${redisKey}`);
    if (cached) return cached;
  }
  return readJson(path.join(CACHE_DIR, filename));
}

export async function saveCacheEntry(redisKey: string, data: unknown) {
  if (!redis) throw new Error("Redis not configured — cannot persist cache entry");
  await redis.set(`cache:${redisKey}`, data);
}

export function getDailyMetrics(): Promise<DailyMetricsCache> {
  return getCache("daily-metrics", "daily-metrics.json");
}

export function getAnalyticsSummary(): Promise<AnalyticsSummaryCache> {
  return getCache("analytics-summary", "analytics-summary.json");
}

export function getTrainingTrends(): Promise<TrainingTrendsCache> {
  return getCache("training-trends", "training-trends.json");
}

export function getInjuryRisk(): Promise<InjuryRiskCache> {
  return getCache("injury-risk", "injury-risk.json");
}

export function getAnomalies(): Promise<AnomaliesCache> {
  return getCache("anomalies", "anomalies.json");
}

export function getActivities(): Promise<ActivitiesCache> {
  return getCache("activities", "activities.json");
}

export function getPerformanceEstimates(): Promise<PerformanceEstimatesCache> {
  return getCache("performance-estimates", "performance-estimates.json");
}

export function getCurves(): Promise<CurvesCache> {
  return getCache("curves", "curves.json");
}

export async function getCacheFreshness(): Promise<{ fetchedAt: string; staleDays: number }> {
  const { fetchedAt } = await getDailyMetrics();
  const staleDays = Math.floor((Date.now() - new Date(fetchedAt).getTime()) / 86_400_000);
  return { fetchedAt, staleDays };
}

export async function getGoals(): Promise<Goal[]> {
  if (redis) return (await redis.get<Goal[]>("goals")) ?? [];
  return readJson(path.join(USER_DIR, "goals.json"));
}

export async function saveGoals(goals: Goal[]) {
  if (redis) {
    await redis.set("goals", goals);
    return;
  }
  writeJson(path.join(USER_DIR, "goals.json"), goals);
}

export async function getCompetitions(): Promise<CompetitionResult[]> {
  if (redis) return (await redis.get<CompetitionResult[]>("competitions")) ?? [];
  return readJson(path.join(USER_DIR, "competitions.json"));
}

export async function saveCompetitions(competitions: CompetitionResult[]) {
  if (redis) {
    await redis.set("competitions", competitions);
    return;
  }
  writeJson(path.join(USER_DIR, "competitions.json"), competitions);
}

async function getUserCollection<T>(redisKey: string, filename: string): Promise<T[]> {
  if (redis) return (await redis.get<T[]>(redisKey)) ?? [];
  try {
    return readJson(path.join(USER_DIR, filename));
  } catch {
    return [];
  }
}

async function saveUserCollection<T>(redisKey: string, filename: string, data: T[]) {
  if (redis) {
    await redis.set(redisKey, data);
    return;
  }
  writeJson(path.join(USER_DIR, filename), data);
}

export function getStrengthSessions(): Promise<StrengthSession[]> {
  return getUserCollection("strength-sessions", "strength-sessions.json");
}

export function saveStrengthSessions(sessions: StrengthSession[]) {
  return saveUserCollection("strength-sessions", "strength-sessions.json", sessions);
}

export function getBenchmarks(): Promise<Benchmark[]> {
  return getUserCollection("benchmarks", "benchmarks.json");
}

export function saveBenchmarks(benchmarks: Benchmark[]) {
  return saveUserCollection("benchmarks", "benchmarks.json", benchmarks);
}

export function getActivityNotes(): Promise<ActivityNote[]> {
  return getUserCollection("activity-notes", "activity-notes.json");
}

export function saveActivityNotes(notes: ActivityNote[]) {
  return saveUserCollection("activity-notes", "activity-notes.json", notes);
}
