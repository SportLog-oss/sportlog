import { NextRequest, NextResponse } from "next/server";
import { getMentalHealthCheckins, saveMentalHealthCheckins } from "@/lib/data/store";
import type { MentalHealthCheckin } from "@/lib/types";

export async function GET() {
  const checkins = await getMentalHealthCheckins();
  return NextResponse.json(checkins.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (typeof body.valence !== "number" || body.valence < -1 || body.valence > 1) {
    return NextResponse.json({ error: "valence must be a number between -1 and 1" }, { status: 400 });
  }

  const checkins = await getMentalHealthCheckins();
  const now = new Date().toISOString();
  const newCheckin: MentalHealthCheckin = {
    id: `mh-${Date.now()}`,
    timestamp: body.timestamp ?? now,
    type: body.type === "mood" ? "mood" : "emotion",
    valence: body.valence,
    emotionTags: body.emotionTags ?? [],
    influenceTags: body.influenceTags ?? [],
    note: body.note ?? "",
    createdAt: now,
  };

  checkins.push(newCheckin);
  await saveMentalHealthCheckins(checkins);
  return NextResponse.json(newCheckin, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const checkins = (await getMentalHealthCheckins()).filter((c) => c.id !== id);
  await saveMentalHealthCheckins(checkins);
  return NextResponse.json({ ok: true });
}
