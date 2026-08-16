import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCompetitions, saveCompetitions } from "@/lib/data/store";
import type { CompetitionResult } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await getCompetitions());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const competitions = await getCompetitions();

  const hasResult = !!body.result;

  const entry: CompetitionResult = {
    id: randomUUID(),
    status: body.status ?? (hasResult ? "completed" : "planned"),
    name: body.name,
    date: body.date,
    location: body.location ?? "",
    distanceMeters: body.distanceMeters ?? 2000,
    boatClass: body.boatClass ?? "",
    crew: body.crew ?? "",
    goal: body.goal ?? "",
    result: body.result ?? "",
    placement: body.placement ?? null,
    splits: body.splits ?? [],
    avgHeartRate: body.avgHeartRate ?? null,
    weather: body.weather ?? "",
    wind: body.wind ?? "",
    notes: body.notes ?? "",
    analysis: null,
    createdAt: new Date().toISOString().slice(0, 10),
    races: [],
  };

  competitions.unshift(entry);
  await saveCompetitions(competitions);
  return NextResponse.json(entry, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const competitions = await getCompetitions();
  const idx = competitions.findIndex((c) => c.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });

  competitions[idx] = {
    ...competitions[idx],
    ...body,
    status: body.result ? "completed" : (body.status ?? competitions[idx].status),
  };
  await saveCompetitions(competitions);
  return NextResponse.json(competitions[idx]);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const competitions = (await getCompetitions()).filter((c) => c.id !== id);
  await saveCompetitions(competitions);
  return NextResponse.json({ ok: true });
}
