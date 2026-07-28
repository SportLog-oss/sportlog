import { NextRequest, NextResponse } from "next/server";
import { getPlannedSessions, savePlannedSessions } from "@/lib/data/store";
import type { PlannedSession } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await getPlannedSessions());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sessions = await getPlannedSessions();

  const entry: PlannedSession = {
    id: `plan-${Date.now()}`,
    date: body.date,
    title: body.title,
    sportType: body.sportType ?? "",
    notes: body.notes ?? "",
    done: false,
    createdAt: new Date().toISOString().slice(0, 10),
  };

  sessions.push(entry);
  await savePlannedSessions(sessions);
  return NextResponse.json(entry, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const sessions = await getPlannedSessions();
  const idx = sessions.findIndex((s) => s.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
  sessions[idx] = { ...sessions[idx], ...body };
  await savePlannedSessions(sessions);
  return NextResponse.json(sessions[idx]);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const sessions = (await getPlannedSessions()).filter((s) => s.id !== id);
  await savePlannedSessions(sessions);
  return NextResponse.json({ ok: true });
}
