import { NextRequest, NextResponse } from "next/server";
import { finishAthleteDataSync, saveCacheEntry, startAthleteDataSync } from "@/lib/data/store";

const ALLOWED_KEYS = [
  "daily-metrics",
  "analytics-summary",
  "training-trends",
  "injury-risk",
  "anomalies",
  "activities",
  "performance-estimates",
  "curves",
];

// Protected endpoint for the daily AthleteData refresh routine to push fresh
// data into Redis. Real training/health data must never be committed to git
// (this repo is public), so this is the only way the cache gets updated after
// initial deploy. Requires a shared secret — not user-facing.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret");
  if (!process.env.SYNC_SECRET || secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const entries: Record<string, unknown> = body.entries ?? {};

  const saved: string[] = [];
  const skipped: string[] = [];
  const failed: { key: string; error: string }[] = [];
  await startAthleteDataSync("external_push");

  for (const key of ALLOWED_KEYS) {
    if (entries[key] !== undefined && entries[key] !== null) {
      try {
        await saveCacheEntry(key, entries[key]);
        saved.push(key);
      } catch (error) {
        failed.push({ key, error: error instanceof Error ? error.message : String(error) });
      }
    } else {
      skipped.push(key);
    }
  }

  await finishAthleteDataSync(saved, failed);
  return NextResponse.json({ ok: failed.length === 0, saved, skipped, failed }, { status: failed.length ? 500 : 200 });
}
