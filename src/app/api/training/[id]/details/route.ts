import { NextResponse } from "next/server";
import { callAthleteDataTool } from "@/lib/athleteDataDirect";
import { parseLaps } from "@/lib/laps";
import type { ActivitySeriesPoint } from "@/lib/types";

interface FitSession {
  total_training_effect?: number;
  total_anaerobic_training_effect?: number;
  total_ascent?: number;
  total_descent?: number;
  est_sweat_loss?: number;
  workout_rpe?: number;
}

interface FitRecord {
  timestamp?: string;
  timer_time?: number;
  elapsed_time?: number;
  heart_rate?: number;
  enhanced_speed?: number;
  enhanced_altitude?: number;
  cadence?: number;
  power?: number;
  distance?: number;
}

interface ActivityFileResult {
  sessions?: FitSession[];
  laps?: string[];
  records?: FitRecord[];
  lapStructureWarning?: string;
}

// garmin_get_activity_file's `records` are downsampled FIT data points (every `sample_seconds`).
// enhanced_altitude comes back in millimeters (÷1000 → meters, matching total_ascent/total_descent
// which use the same scale), enhanced_speed and distance are already in km/h and km respectively.
function computeSeries(records: FitRecord[]): ActivitySeriesPoint[] {
  if (records.length === 0) return [];
  const t0 = records[0].timestamp ? new Date(records[0].timestamp).getTime() : null;

  return records.map((r) => {
    let t = 0;
    if (typeof r.elapsed_time === "number") t = r.elapsed_time;
    else if (typeof r.timer_time === "number") t = r.timer_time;
    else if (t0 !== null && r.timestamp) t = Math.round((new Date(r.timestamp).getTime() - t0) / 1000);

    return {
      t,
      heartRate: r.heart_rate ?? null,
      speedKmh: r.enhanced_speed ?? null,
      altitudeM: r.enhanced_altitude != null ? r.enhanced_altitude / 1000 : null,
      cadence: r.cadence ?? null,
      power: r.power ?? null,
      distanceKm: r.distance ?? null,
    };
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const file = await callAthleteDataTool<ActivityFileResult>("garmin_get_activity_file", {
      id,
      sample_seconds: 60,
    });

    const session = file.sessions?.[0];
    if (!session) return NextResponse.json({ hasDetails: false });

    const laps = file.laps && file.laps.length > 1 ? parseLaps(file.laps) : [];
    const series = file.records ? computeSeries(file.records) : [];

    return NextResponse.json({
      hasDetails: true,
      trainingEffect: session.total_training_effect ?? null,
      anaerobicTrainingEffect: session.total_anaerobic_training_effect ?? null,
      totalAscent: session.total_ascent != null ? session.total_ascent / 1000 : null,
      totalDescent: session.total_descent != null ? session.total_descent / 1000 : null,
      sweatLossMl: session.est_sweat_loss ?? null,
      rpe: session.workout_rpe ?? null,
      laps,
      series,
    });
  } catch {
    return NextResponse.json({ hasDetails: false });
  }
}
