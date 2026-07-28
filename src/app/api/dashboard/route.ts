import { NextResponse } from "next/server";
import {
  getAnomalies,
  getCompetitions,
  getDailyMetrics,
  getGoals,
  getInjuryRisk,
  getTrainingTrends,
} from "@/lib/data/store";
import { explainHrv, explainLoad, explainRhr, generateTodayRecommendation, generateWarnings } from "@/lib/insights";

export async function GET() {
  const daily = await getDailyMetrics();
  const trends = await getTrainingTrends();
  const injuryRisk = await getInjuryRisk();
  const anomalies = await getAnomalies();
  const goals = await getGoals();
  const competitions = await getCompetitions();

  const rows = daily.rows;
  const last = rows[rows.length - 1];
  const lastWithRecovery = [...rows].reverse().find((r) => r.recoveryScore !== null);

  return NextResponse.json({
    fetchedAt: daily.fetchedAt,
    rows,
    stats: {
      readinessScoreV2: lastWithRecovery?.readinessScoreV2 ?? null,
      readinessVerdict: lastWithRecovery?.readinessVerdict ?? null,
      recoveryScore: lastWithRecovery?.recoveryScore ?? null,
      hrv: last.hrv ?? trends.recovery.hrv_values.at(-1)?.hrv ?? null,
      hrvTrend: trends.recovery.hrv_trend,
      restingHr: last.restingHr ?? trends.recovery.rhr_values.at(-1)?.rhr ?? null,
      rhrTrend: trends.recovery.rhr_trend,
      sleepScoreAvg: trends.sleep.avg_score,
      sleepHoursAvg: trends.sleep.avg_duration_hours,
      tsb: last.tsb,
      injuryRiskIndex: injuryRisk.index,
      goalsCount: goals.length,
    },
    recommendation: generateTodayRecommendation(rows, injuryRisk),
    warnings: generateWarnings(rows, anomalies.anomalies, injuryRisk),
    explanations: {
      hrv: explainHrv(rows),
      rhr: explainRhr(rows),
      load: explainLoad(rows),
    },
    goals: goals.slice(0, 3),
    competitions: competitions.slice(0, 3),
  });
}
