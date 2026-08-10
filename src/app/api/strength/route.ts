import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getStrengthSessions, saveStrengthSessions } from "@/lib/data/store";
import type { StrengthSession } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await getStrengthSessions());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sessions = await getStrengthSessions();

  const entry: StrengthSession = {
    id: randomUUID(),
    date: body.date,
    title: body.title ?? "Krafttraining",
    activityId: body.activityId,
    exercises: body.exercises ?? [],
    notes: body.notes ?? "",
    createdAt: new Date().toISOString().slice(0, 10),
  };

  sessions.unshift(entry);
  await saveStrengthSessions(sessions);
  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const sessions = (await getStrengthSessions()).filter((s) => s.id !== id);
  await saveStrengthSessions(sessions);
  return NextResponse.json({ ok: true });
}
