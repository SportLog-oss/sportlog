import { NextResponse } from "next/server";
import { callAthleteDataTool } from "@/lib/athleteDataDirect";

const QUALIFIER_LABELS: Record<string, string> = {
  EXCELLENT: "Ausgezeichnet",
  GOOD: "Gut",
  FAIR: "Ausreichend",
  POOR: "Niedrig",
};

const FACTOR_LABELS: Record<string, string> = {
  stress: "Stress",
  awakeCount: "Aufwachhäufigkeit",
  restlessness: "Unruhe",
  remPercentage: "REM-Anteil",
  totalDuration: "Gesamtdauer",
  deepPercentage: "Tiefschlaf-Anteil",
  lightPercentage: "Leichtschlaf-Anteil",
};

const FACTOR_ORDER = [
  "totalDuration",
  "deepPercentage",
  "lightPercentage",
  "remPercentage",
  "restlessness",
  "awakeCount",
  "stress",
];

interface SleepRecord {
  calendarDate: string;
  durationInSeconds: number;
  overallSleepScore?: { value: number; qualifierKey: string };
  remSleepInSeconds?: number;
  deepSleepDurationInSeconds?: number;
  lightSleepDurationInSeconds?: number;
  awakeDurationInSeconds?: number;
  sleepScores?: Record<string, { qualifierKey: string }>;
}

interface HrvRecord {
  calendarDate: string;
  lastNightAvg?: number;
  lastNight5MinHigh?: number;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const [sleepRows, hrvRows] = await Promise.all([
      callAthleteDataTool<SleepRecord[]>("garmin_get_sleep", { start_date: daysAgoIso(4), end_date: todayIso() }),
      callAthleteDataTool<HrvRecord[]>("garmin_get_hrv", { start_date: daysAgoIso(4), end_date: todayIso() }).catch(
        () => [] as HrvRecord[]
      ),
    ]);

    if (!sleepRows || sleepRows.length === 0) {
      return NextResponse.json({ hasData: false });
    }

    const latest = [...sleepRows].sort((a, b) => b.calendarDate.localeCompare(a.calendarDate))[0];
    const hrv = hrvRows.find((h) => h.calendarDate === latest.calendarDate);

    const factors = FACTOR_ORDER.filter((key) => latest.sleepScores?.[key]).map((key) => ({
      label: FACTOR_LABELS[key],
      value: QUALIFIER_LABELS[latest.sleepScores![key].qualifierKey] ?? latest.sleepScores![key].qualifierKey,
    }));

    return NextResponse.json({
      hasData: true,
      date: latest.calendarDate,
      score: latest.overallSleepScore?.value ?? null,
      scoreQualifier: latest.overallSleepScore?.qualifierKey
        ? QUALIFIER_LABELS[latest.overallSleepScore.qualifierKey] ?? latest.overallSleepScore.qualifierKey
        : null,
      durationSec: latest.durationInSeconds,
      deepSec: latest.deepSleepDurationInSeconds ?? null,
      lightSec: latest.lightSleepDurationInSeconds ?? null,
      remSec: latest.remSleepInSeconds ?? null,
      awakeSec: latest.awakeDurationInSeconds ?? null,
      factors,
      overnightHrv: hrv?.lastNightAvg ?? null,
      overnightHrvHigh: hrv?.lastNight5MinHigh ?? null,
    });
  } catch {
    return NextResponse.json({ hasData: false });
  }
}
