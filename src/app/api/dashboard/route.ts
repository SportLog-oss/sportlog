import { NextResponse } from "next/server";
import { getAnomalies, getCompetitions, getDailyMetrics, getGoals, getInjuryRisk } from "@/lib/data/store";
import { computeSleepPerformance, computeStrain, generateTodayRecommendation, generateWarnings } from "@/lib/insights";

export async function GET() {
  const daily = await getDailyMetrics();
  const injuryRisk = await getInjuryRisk();
  const anomalies = await getAnomalies();
  const goals = await getGoals();
  const competitions = await getCompetitions();

  const rows = daily.rows;
  const lastWithRecovery = [...rows].reverse().find((r) => r.recoveryScore !== null);
  const lastWithLoad = [...rows].reverse().find((r) => r.dailyLoad !== null);
  const lastWithSleep = [...rows].reverse().find((r) => r.sleepDurationMin !== null && r.sleepNeedMin !== null);
  const activeGoals = goals.filter((g) => !g.achieved);

  return NextResponse.json({
    fetchedAt: daily.fetchedAt,
    stats: {
      recoveryPct: lastWithRecovery?.recoveryScore ?? null,
      strain: computeStrain(lastWithLoad?.dailyLoad ?? null),
      sleepPerformance: computeSleepPerformance(lastWithSleep?.sleepDurationMin, lastWithSleep?.sleepNeedMin),
    },
    recommendation: generateTodayRecommendation(rows, injuryRisk),
    warnings: generateWarnings(rows, anomalies.anomalies, injuryRisk),
    goals: activeGoals.slice(0, 3),
    competitions: competitions.slice(0, 3),
  });
}
