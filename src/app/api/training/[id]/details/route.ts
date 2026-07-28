import { NextResponse } from "next/server";
import { callAthleteDataTool } from "@/lib/athleteDataDirect";
import { parseLaps } from "@/lib/laps";

interface FitSession {
  total_training_effect?: number;
  total_anaerobic_training_effect?: number;
  total_ascent?: number;
  total_descent?: number;
  est_sweat_loss?: number;
  workout_rpe?: number;
}

interface ActivityFileResult {
  sessions?: FitSession[];
  laps?: string[];
  lapStructureWarning?: string;
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

    return NextResponse.json({
      hasDetails: true,
      trainingEffect: session.total_training_effect ?? null,
      anaerobicTrainingEffect: session.total_anaerobic_training_effect ?? null,
      totalAscent: session.total_ascent != null ? session.total_ascent / 1000 : null,
      totalDescent: session.total_descent != null ? session.total_descent / 1000 : null,
      sweatLossMl: session.est_sweat_loss ?? null,
      rpe: session.workout_rpe ?? null,
      laps,
    });
  } catch {
    return NextResponse.json({ hasDetails: false });
  }
}
