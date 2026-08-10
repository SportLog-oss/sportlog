import { NextResponse } from "next/server";
import { callAthleteDataTool } from "@/lib/athleteDataDirect";
import {
  buildActivityOverview,
  buildActivityStatistics,
  buildImportedTrainingLog,
  computeActivitySeries,
  resolveSportKind,
  type AthleteActivityDetail,
  type AthleteActivityFile,
} from "@/lib/activityDetails";
import { getActivities, getCachedActivityDetails, saveCachedActivityDetails } from "@/lib/data/store";
import { parseLaps } from "@/lib/laps";
import type { ActivityDetails } from "@/lib/types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cached = await getCachedActivityDetails(id).catch(() => null);
  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < 5 * 60 * 1000) {
    return NextResponse.json(cached.details);
  }

  const [fileResult, detailResult, activitiesResult] = await Promise.allSettled([
    callAthleteDataTool<AthleteActivityFile>("garmin_get_activity_file", {
      id,
      sample_seconds: 15,
    }),
    callAthleteDataTool<AthleteActivityDetail>("get_activity_detail", {
      source_activity_id: id,
      source: "garmin",
    }),
    getActivities(),
  ]);

  const file = fileResult.status === "fulfilled" ? fileResult.value : null;
  const detail = detailResult.status === "fulfilled" ? detailResult.value : null;
  const summary =
    activitiesResult.status === "fulfilled"
      ? activitiesResult.value.activities.find((activity) => String(activity.activityId) === id) ?? null
      : null;
  const session = file?.sessions?.[0];
  const records = file?.records ?? [];
  const sport = resolveSportKind(summary, detail);
  const statistics = buildActivityStatistics(summary, detail, session, records);
  const detailZones = detail?.activity?.hrZones;
  const hrZones =
    detailZones && typeof detailZones === "object"
      ? detailZones as ActivityDetails["hrZones"]
      : summary?.hrZones ?? null;

  const response: ActivityDetails = {
    hasDetails: Boolean(file || detail),
    statistics,
    overviewMetrics: buildActivityOverview(sport, statistics),
    hrZones,
    hrZonesSource: hrZones
      ? detail?.activity?.hrZonesSource === "ours"
        ? "AthleteData"
        : detail?.activity?.hrZonesSource === "garmin"
          ? "Garmin"
          : "Garmin / AthleteData"
      : null,
    importedLog: buildImportedTrainingLog(detail, session),
    laps: file?.laps && file.laps.length > 1 ? parseLaps(file.laps) : [],
    series: computeActivitySeries(records, sport),
  };

  if (!file && !detail && cached) return NextResponse.json(cached.details);
  await saveCachedActivityDetails(id, response).catch(() => undefined);
  return NextResponse.json(response);
}
