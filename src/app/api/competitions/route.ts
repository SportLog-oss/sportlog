import { NextRequest, NextResponse } from "next/server";
import { getCompetitions, saveCompetitions } from "@/lib/data/store";
import type { CompetitionResult } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await getCompetitions());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const competitions = await getCompetitions();

  const entry: CompetitionResult = {
    id: `comp-${Date.now()}`,
    name: body.name,
    date: body.date,
    location: body.location ?? "",
    distanceMeters: body.distanceMeters ?? 2000,
    boatClass: body.boatClass ?? "",
    crew: body.crew ?? "",
    result: body.result ?? "",
    placement: body.placement ?? null,
    splits: body.splits ?? [],
    avgHeartRate: body.avgHeartRate ?? null,
    weather: body.weather ?? "",
    wind: body.wind ?? "",
    notes: body.notes ?? "",
    analysis: null,
    createdAt: new Date().toISOString().slice(0, 10),
  };

  competitions.unshift(entry);
  await saveCompetitions(competitions);
  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const competitions = (await getCompetitions()).filter((c) => c.id !== id);
  await saveCompetitions(competitions);
  return NextResponse.json({ ok: true });
}
