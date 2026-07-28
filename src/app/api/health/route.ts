import { NextResponse } from "next/server";
import { getDailyMetrics, getInjuryRisk, getTrainingTrends } from "@/lib/data/store";
import { explainInjuryRisk, explainSleep } from "@/lib/insights";

export async function GET() {
  const daily = getDailyMetrics();
  const trends = getTrainingTrends();
  const injuryRisk = getInjuryRisk();

  return NextResponse.json({
    rows: daily.rows,
    trends,
    injuryRisk,
    explanations: {
      sleep: explainSleep(daily.rows),
      injuryRisk: explainInjuryRisk(injuryRisk),
    },
  });
}
