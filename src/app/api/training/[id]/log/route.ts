import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getTrainingLogEntries, saveTrainingLogEntries } from "@/lib/data/store";
import type { TrainingLogEntry } from "@/lib/types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activityId = Number(id);
  const entries = await getTrainingLogEntries();
  const entry = entries.find((e) => e.activityId === activityId) ?? null;
  return NextResponse.json(entry);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activityId = Number(id);
  const body = await req.json();
  const entries = await getTrainingLogEntries();
  const idx = entries.findIndex((e) => e.activityId === activityId);
  const now = new Date().toISOString();

  const updated: TrainingLogEntry =
    idx === -1
      ? {
          id: randomUUID(),
          activityId,
          date: body.date ?? now.slice(0, 10),
          pain: body.pain ?? [],
          injury: body.injury ?? false,
          soreness: body.soreness ?? null,
          rpe: body.rpe ?? null,
          notes: body.notes ?? "",
          createdAt: now,
          updatedAt: now,
        }
      : { ...entries[idx], ...body, activityId, updatedAt: now };

  if (idx === -1) entries.push(updated);
  else entries[idx] = updated;

  await saveTrainingLogEntries(entries);
  return NextResponse.json(updated);
}
