import { NextResponse } from "next/server";
import { getActivities, getAnalyticsSummary, getCurves, getPerformanceEstimates } from "@/lib/data/store";

export async function GET() {
  return NextResponse.json({
    activities: getActivities().activities,
    weeklyVolume: getAnalyticsSummary().weekly_volume,
    hrZones: getAnalyticsSummary().hr_zones,
    performance: getPerformanceEstimates(),
    curves: getCurves(),
  });
}
