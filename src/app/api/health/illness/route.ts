import { NextRequest, NextResponse } from "next/server";
import { getIllnessLog, saveIllnessLog } from "@/lib/data/store";
import type { IllnessLogEntry } from "@/lib/types";

export async function GET() {
  const entries = await getIllnessLog();
  return NextResponse.json(entries.sort((a, b) => b.startDate.localeCompare(a.startDate)));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const entries = await getIllnessLog();

  const now = new Date().toISOString();
  const newEntry: IllnessLogEntry = {
    id: `illness-${Date.now()}`,
    startDate: body.startDate ?? now.slice(0, 10),
    endDate: body.endDate ?? null,
    symptoms: body.symptoms ?? [],
    medications: body.medications ?? [],
    doctorVisits: body.doctorVisits ?? false,
    trainingPausedFrom: body.trainingPausedFrom ?? null,
    trainingPausedUntil: body.trainingPausedUntil ?? null,
    returnedToTrainingOn: body.returnedToTrainingOn ?? null,
    notes: body.notes ?? "",
    createdAt: now,
    updatedAt: now,
  };

  entries.push(newEntry);
  await saveIllnessLog(entries);
  return NextResponse.json(newEntry, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const entries = await getIllnessLog();
  const idx = entries.findIndex((e) => e.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
  entries[idx] = { ...entries[idx], ...body, updatedAt: new Date().toISOString() };
  await saveIllnessLog(entries);
  return NextResponse.json(entries[idx]);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const entries = (await getIllnessLog()).filter((e) => e.id !== id);
  await saveIllnessLog(entries);
  return NextResponse.json({ ok: true });
}
