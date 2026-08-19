import { callAthleteDataTool } from "@/lib/athleteDataDirect";
import {
  finishAthleteDataSync,
  finishActivityPush,
  getActivities,
  getReminderPreferences,
  claimActivityPush,
  releaseActivityPush,
  saveCacheEntry,
  saveImportedProfileValues,
  startAthleteDataSync,
  upsertCalendarEvents,
  upsertPersonalBestIfBetter,
} from "@/lib/data/store";
import { mapGoogleEvent, type GoogleCalendarResponse } from "@/lib/calendarSync";
import { generateTodayRecommendation, generateWarnings } from "@/lib/insights";
import { findPersonalBestCandidates, PB_CATEGORY_META } from "@/lib/personalBests";
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

type SyncScope = "all" | "activities";
type SyncResult = Awaited<ReturnType<typeof performSync>>;

const syncsInFlight = new Map<SyncScope, Promise<SyncResult>>();

export function runSync({ notify, scope = "all" }: { notify: boolean; scope?: SyncScope }) {
  const existing = syncsInFlight.get(scope);
  if (existing) return existing;

  const pending = runTrackedSync({ notify, scope }).finally(() => {
    syncsInFlight.delete(scope);
  });
  syncsInFlight.set(scope, pending);
  return pending;
}

async function runTrackedSync({ notify, scope }: { notify: boolean; scope: SyncScope }) {
  await startAthleteDataSync(notify ? "cron" : "manual");
  try {
    const result = await performSync({ notify, scope });
    await finishAthleteDataSync(result.saved, result.failed);
    return result;
  } catch (error) {
    const failures = [{ key: "sync", error: errorMessage(error) }];
    await finishAthleteDataSync([], failures).catch(() => undefined);
    throw error;
  }
}

/**
 * Supabase/PostgREST errors carry a readable `.message` but aren't `instanceof Error`, so the
 * previous `error instanceof Error ? error.message : String(error)` check silently degraded them
 * to the useless "[object Object]".
 */
function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return String(error);
}

async function performSync({ notify, scope }: { notify: boolean; scope: SyncScope }) {
  const startedAt = Date.now();
  const now = new Date().toISOString();
  const saved: string[] = [];
  const failed: { key: string; error: string }[] = [];
  const timings: Record<string, number> = {};

  async function sync<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
    const categoryStartedAt = Date.now();
    try {
      const data = await fn();
      await saveCacheEntry(key, data);
      saved.push(key);
      return data;
    } catch (error) {
      failed.push({ key, error: errorMessage(error) });
      return null;
    } finally {
      timings[key] = Date.now() - categoryStartedAt;
    }
  }

  const previousActivities = await getActivities().catch(() => ({ fetchedAt: now, activities: [] as Activity[] }));
  const latestStart = previousActivities.activities[0]?.startTimeInSeconds;
  const overlapStart = new Date(
    latestStart ? latestStart * 1000 - 24 * 60 * 60 * 1000 : Date.now() - 90 * 24 * 60 * 60 * 1000
  );
  const activityPromise = sync("activities", async () => {
    const activities = await callAthleteDataTool<Activity[]>("garmin_get_activities", {
      start_date: overlapStart.toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });
    return { fetchedAt: now, activities };
  });

  let dailyMetrics: DailyMetricsCache | null = null;
  let injuryRisk: InjuryRiskCache | null = null;
  let anomalies: AnomaliesCache | null = null;
  let performance: PerformanceEstimatesCache | null = null;
  let userMetrics: unknown = null;

  if (scope === "all") {
    const [dailyResult, , , injuryResult, anomalyResult, performanceResult, , userMetricsResult, ,] = await Promise.all([
      sync<DailyMetricsCache>("daily-metrics", async () => {
        const raw = await callAthleteDataTool<{ period: string; rows: DailyMetricRow[] }>("get_daily_metrics");
        return { fetchedAt: now, period: raw.period, rows: raw.rows };
      }),
      sync<AnalyticsSummaryCache>("analytics-summary", async () => {
        const raw = await callAthleteDataTool<Omit<AnalyticsSummaryCache, "fetchedAt">>("get_analytics_summary");
        return { ...raw, fetchedAt: now };
      }),
      sync<TrainingTrendsCache>("training-trends", async () => {
        const raw = await callAthleteDataTool<Omit<TrainingTrendsCache, "fetchedAt">>("get_training_trends");
        return { ...raw, fetchedAt: now };
      }),
      sync<InjuryRiskCache>("injury-risk", async () => {
        const raw = await callAthleteDataTool<Omit<InjuryRiskCache, "fetchedAt">>("get_injury_risk");
        return { ...raw, fetchedAt: now };
      }),
      sync<AnomaliesCache>("anomalies", async () => {
        const raw = await callAthleteDataTool<Omit<AnomaliesCache, "fetchedAt">>("get_anomalies");
        return { ...raw, fetchedAt: now };
      }),
      sync<PerformanceEstimatesCache>("performance-estimates", async () => {
        const raw = await callAthleteDataTool<Omit<PerformanceEstimatesCache, "fetchedAt">>("get_performance_estimates");
        return { ...raw, fetchedAt: now };
      }),
      sync<CurvesCache>("curves", async () => {
        const [power, pace] = await Promise.all([
          callAthleteDataTool<CurvesCache["power"]>("get_power_curve"),
          callAthleteDataTool<CurvesCache["pace"]>("get_pace_curve"),
        ]);
        return { fetchedAt: now, power, pace };
      }),
      sync<{ fetchedAt: string; data: unknown }>("user-metrics", async () => ({
        fetchedAt: now,
        data: await callAthleteDataTool("garmin_get_user_metrics"),
      })),
      sync<{ fetchedAt: string; count: number }>("calendar-google", async () => {
        const response = await callAthleteDataTool<GoogleCalendarResponse>("google_calendar_get_events", {});
        const rows = (response.items ?? []).map((event) => mapGoogleEvent(event, response.summary, now));
        await upsertCalendarEvents(rows);
        return { fetchedAt: now, count: rows.length };
      }),
    ]);
    dailyMetrics = dailyResult;
    injuryRisk = injuryResult;
    anomalies = anomalyResult;
    performance = performanceResult;
    userMetrics = userMetricsResult?.data ?? null;

    const latestWeight = [...(dailyMetrics?.rows ?? [])].reverse().find((row) => row.weight != null);
    const latestRestingHr = [...(dailyMetrics?.rows ?? [])].reverse().find((row) => row.restingHr != null);
    const importedValues: Parameters<typeof saveImportedProfileValues>[0] = {};
    if (latestWeight?.weight != null) {
      importedValues.weightKg = {
        value: latestWeight.weight,
        source: "Garmin / AthleteData",
        observedAt: latestWeight.date,
      };
    }
    if (latestRestingHr?.restingHr != null) {
      importedValues.hrRest = {
        value: latestRestingHr.restingHr,
        source: "Garmin / AthleteData",
        observedAt: latestRestingHr.date,
      };
    }
    const vo2max = findNumericField(userMetrics, ["vo2Max", "vo2max", "vo2_max"]);
    if (vo2max != null) {
      importedValues.vo2max = { value: vo2max, source: "Garmin / AthleteData", observedAt: now };
    }
    if (performance?.ftp_watts != null) {
      importedValues.ftpWatts = {
        value: performance.ftp_watts,
        source: "Garmin / AthleteData",
        observedAt: performance.fetchedAt,
      };
    }
    if (Object.keys(importedValues).length > 0) {
      await saveImportedProfileValues(importedValues).catch((error) => {
        failed.push({ key: "profile-import", error: error instanceof Error ? error.message : String(error) });
      });
    }
  }

  const activitiesResult = await activityPromise;
  const knownActivityIds = new Set(previousActivities.activities.map((activity) => activity.activityId));
  const newActivities =
    previousActivities.activities.length === 0
      ? []
      : (activitiesResult?.activities ?? []).filter((activity) => !knownActivityIds.has(activity.activityId));
  const newPersonalBests: { category: string; value: number }[] = [];
  if (activitiesResult) {
    for (const candidate of findPersonalBestCandidates(activitiesResult.activities)) {
      try {
        const { improved } = await upsertPersonalBestIfBetter(candidate.category, candidate.value, candidate.activityId);
        if (improved) {
          newPersonalBests.push({ category: PB_CATEGORY_META[candidate.category].label, value: candidate.value });
        }
      } catch (error) {
        failed.push({
          key: `personal-best:${candidate.category}`,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  let notified = false;
  let pushDebug: unknown = null;
  if (notify && newActivities.length > 0) {
    const preferences = await getReminderPreferences().catch(() => null);
    if (preferences?.enabledTypes.includes("new-activity")) {
      for (const activity of newActivities) {
        const externalId = String(activity.activityId);
        let claimed = false;
        try {
          claimed = await claimActivityPush(externalId, activity.activityId);
          if (!claimed) continue;
          const distance =
            activity.distanceInMeters > 0
              ? ` – ${(activity.distanceInMeters / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} km`
              : "";
          pushDebug = await sendPushToAll(
            "Neue Aktivität synchronisiert",
            `${activity.activityName}${distance}`,
            {
              activityId: externalId,
              deepLink: `sportlog://training/${externalId}`,
            }
          );
          await finishActivityPush(externalId);
          notified = true;
        } catch (error) {
          if (claimed) await releaseActivityPush(externalId).catch(() => undefined);
          failed.push({
            key: `activity-push:${externalId}`,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  if (notify && dailyMetrics && injuryRisk) {
    try {
      const warnings = generateWarnings(dailyMetrics.rows, anomalies?.anomalies ?? [], injuryRisk);
      const recommendation = generateTodayRecommendation(dailyMetrics.rows, injuryRisk);
      const critical = warnings.find((warning) => warning.level === "critical") ?? warnings[0];
      pushDebug = critical
        ? await sendPushToAll(critical.title, critical.message)
        : await sendPushToAll("Heutige Empfehlung", recommendation);
      notified = true;
    } catch (error) {
      failed.push({ key: "push", error: error instanceof Error ? error.message : String(error) });
    }
  }

  timings.total = Date.now() - startedAt;
  return {
    ok: failed.length === 0,
    scope,
    saved,
    failed,
    notified,
    pushDebug,
    newPersonalBests,
    timings,
  };
}

function findNumericField(value: unknown, keys: string[]): number | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index -= 1) {
      const found = findNumericField(value[index], keys);
      if (found != null) return found;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
  }
  for (const candidate of Object.values(record)) {
    const found = findNumericField(candidate, keys);
    if (found != null) return found;
  }
  return null;
}
