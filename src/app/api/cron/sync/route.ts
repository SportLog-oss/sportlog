import { NextRequest, NextResponse } from "next/server";
import { callAthleteDataTool } from "@/lib/athleteDataDirect";
import { saveCacheEntry } from "@/lib/data/store";
import { generateTodayRecommendation, generateWarnings } from "@/lib/insights";
import { sendPushToAll } from "@/lib/push";
import type {
  Activity,
  AnalyticsSummaryCache,
  AnomaliesCache,
  CurvesCache,
  DailyMetricsCache,
  DailyMetricRow,
  InjuryRiskCache,
  PerformanceEstimatesCache,
  TrainingTrendsCache,
} from "@/lib/types";

export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured yet — allow (dev convenience)
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date().toISOString();
  const saved: string[] = [];
  const failed: { key: string; error: string }[] = [];

  async function sync<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
    try {
      const data = await fn();
      await saveCacheEntry(key, data);
      saved.push(key);
      return data;
    } catch (e) {
      failed.push({ key, error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  }

  const dailyMetrics = await sync<DailyMetricsCache>("daily-metrics", async () => {
    const raw = await callAthleteDataTool<{ period: string; rows: DailyMetricRow[] }>("get_daily_metrics");
    return { fetchedAt: now, period: raw.period, rows: raw.rows };
  });

  await sync<AnalyticsSummaryCache>("analytics-summary", async () => {
    const raw = await callAthleteDataTool<Omit<AnalyticsSummaryCache, "fetchedAt">>("get_analytics_summary");
    return { ...raw, fetchedAt: now };
  });

  await sync<TrainingTrendsCache>("training-trends", async () => {
    const raw = await callAthleteDataTool<Omit<TrainingTrendsCache, "fetchedAt">>("get_training_trends");
    return { ...raw, fetchedAt: now };
  });

  const injuryRisk = await sync<InjuryRiskCache>("injury-risk", async () => {
    const raw = await callAthleteDataTool<Omit<InjuryRiskCache, "fetchedAt">>("get_injury_risk");
    return { ...raw, fetchedAt: now };
  });

  const anomalies = await sync<AnomaliesCache>("anomalies", async () => {
    const raw = await callAthleteDataTool<Omit<AnomaliesCache, "fetchedAt">>("get_anomalies");
    return { ...raw, fetchedAt: now };
  });

  await sync<PerformanceEstimatesCache>("performance-estimates", async () => {
    const raw = await callAthleteDataTool<Omit<PerformanceEstimatesCache, "fetchedAt">>("get_performance_estimates");
    return { ...raw, fetchedAt: now };
  });

  await sync<CurvesCache>("curves", async () => {
    const [power, pace] = await Promise.all([
      callAthleteDataTool<CurvesCache["power"]>("get_power_curve"),
      callAthleteDataTool<CurvesCache["pace"]>("get_pace_curve"),
    ]);
    return { fetchedAt: now, power, pace };
  });

  await sync("activities", async () => {
    const list = await callAthleteDataTool<Activity[]>("garmin_get_activities", { limit: 15 });
    const enriched = await Promise.all(
      list.slice(0, 15).map(async (act) => {
        try {
          const detail = await callAthleteDataTool<{
            activity: {
              trainingLoad?: number;
              avgCadence?: number;
              intensityFactor?: number;
              efficiencyFactor?: number;
              avgPower?: number;
              normalizedPower?: number;
              hrZones?: Activity["hrZones"];
            };
          }>("get_activity_detail", { source_activity_id: String(act.activityId), source: "garmin" });
          return {
            ...act,
            trainingLoad: detail.activity.trainingLoad ?? undefined,
            avgCadence: detail.activity.avgCadence ?? undefined,
            intensityFactor: detail.activity.intensityFactor ?? undefined,
            efficiencyFactor: detail.activity.efficiencyFactor ?? undefined,
            avgPower: detail.activity.avgPower ?? undefined,
            normalizedPower: detail.activity.normalizedPower ?? undefined,
            hrZones: detail.activity.hrZones ?? undefined,
          };
        } catch {
          return act;
        }
      })
    );
    return { fetchedAt: now, activities: enriched };
  });

  // Push notifications based on the freshly synced data — plain rule-based logic
  // from src/lib/insights, no AI/agent involved.
  let notified = false;
  let pushDebug: unknown = null;
  if (dailyMetrics && injuryRisk) {
    try {
      const warnings = generateWarnings(dailyMetrics.rows, anomalies?.anomalies ?? [], injuryRisk);
      const recommendation = generateTodayRecommendation(dailyMetrics.rows, injuryRisk);

      if (warnings.length > 0) {
        const critical = warnings.find((w) => w.level === "critical") ?? warnings[0];
        pushDebug = await sendPushToAll(critical.title, critical.message);
      } else {
        pushDebug = await sendPushToAll("Heutige Empfehlung", recommendation);
      }
      notified = true;
    } catch (e) {
      failed.push({ key: "push", error: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({ ok: failed.length === 0, saved, failed, notified, pushDebug });
}
