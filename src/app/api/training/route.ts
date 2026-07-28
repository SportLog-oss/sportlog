import { NextResponse } from "next/server";
import { getActivities, getAnalyticsSummary, getCurves, getPerformanceEstimates } from "@/lib/data/store";

export async function GET() {
  const [activities, analytics, performance, curves] = await Promise.all([
    getActivities(),
    getAnalyticsSummary(),
    getPerformanceEstimates(),
    getCurves(),
  ]);

  return NextResponse.json({
    activities: activities.activities,
    weeklyVolume: analytics.weekly_volume,
    hrZones: analytics.hr_zones,
    performance,
    curves,
  });
}
