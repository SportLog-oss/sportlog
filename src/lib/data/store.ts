import fs from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";
import type {
  ActivitiesCache,
  AnalyticsSummaryCache,
  AnomaliesCache,
  CompetitionResult,
  CurvesCache,
  DailyMetricsCache,
  Goal,
  InjuryRiskCache,
  PerformanceEstimatesCache,
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

// On Vercel the filesystem is read-only at runtime, so user-editable data (goals,
// competitions) is persisted in Upstash Redis when configured. Locally, without
// those env vars, it falls back to the JSON files under data/user/ for convenience.
const redis =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
    : null;

export function getDailyMetrics(): DailyMetricsCache {
  return readJson(path.join(CACHE_DIR, "daily-metrics.json"));
}

export function getAnalyticsSummary(): AnalyticsSummaryCache {
  return readJson(path.join(CACHE_DIR, "analytics-summary.json"));
}

export function getTrainingTrends(): TrainingTrendsCache {
  return readJson(path.join(CACHE_DIR, "training-trends.json"));
}

export function getInjuryRisk(): InjuryRiskCache {
  return readJson(path.join(CACHE_DIR, "injury-risk.json"));
}

export function getAnomalies(): AnomaliesCache {
  return readJson(path.join(CACHE_DIR, "anomalies.json"));
}

export function getActivities(): ActivitiesCache {
  return readJson(path.join(CACHE_DIR, "activities.json"));
}

export function getPerformanceEstimates(): PerformanceEstimatesCache {
  return readJson(path.join(CACHE_DIR, "performance-estimates.json"));
}

export function getCurves(): CurvesCache {
  return readJson(path.join(CACHE_DIR, "curves.json"));
}

export function getCacheFreshness(): { fetchedAt: string; staleDays: number } {
  const { fetchedAt } = getDailyMetrics();
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
