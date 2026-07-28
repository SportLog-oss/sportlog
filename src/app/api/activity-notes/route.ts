import { NextRequest, NextResponse } from "next/server";
import { getActivityNotes, saveActivityNotes } from "@/lib/data/store";

export async function GET() {
  return NextResponse.json(await getActivityNotes());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const activityId = Number(body.activityId);
  const note: string = body.note ?? "";

  const notes = await getActivityNotes();
  const idx = notes.findIndex((n) => n.activityId === activityId);
  const entry = { activityId, note, updatedAt: new Date().toISOString() };

  if (idx === -1) {
    notes.push(entry);
  } else {
    notes[idx] = entry;
  }

  await saveActivityNotes(notes);
  return NextResponse.json(entry, { status: 201 });
}
