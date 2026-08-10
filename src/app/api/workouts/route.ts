import { NextRequest, NextResponse } from "next/server";
import { createWorkout, deleteWorkout, getWorkouts } from "@/lib/data/store";
import type { WorkoutSource } from "@/lib/types";

export async function GET(req: NextRequest) {
  const source = req.nextUrl.searchParams.get("source") as WorkoutSource | null;
  return NextResponse.json(await getWorkouts(source ?? undefined));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const workout = await createWorkout({
    workoutType: body.workoutType,
    source: body.source ?? "manual",
    startedAt: body.startedAt ?? new Date().toISOString(),
    title: body.title ?? null,
    // The workouts table stores broad activity duration/distance as integers. Precision such as
    // 5:09.1 is preserved separately in the benchmark entry; only the general workout summary is
    // rounded here so Concept2 tests with tenths of a second can be saved at all.
    durationSeconds: toNullableInteger(body.durationSeconds),
    distanceMeters: toNullableInteger(body.distanceMeters),
    calories: body.calories ?? null,
    avgHr: body.avgHr ?? null,
    avgWatt: body.avgWatt ?? null,
    summaryText: body.summaryText ?? null,
  });
  return NextResponse.json(workout, { status: 201 });
}

function toNullableInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteWorkout(id);
  return NextResponse.json({ ok: true });
}
