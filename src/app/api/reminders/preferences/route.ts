import { NextRequest, NextResponse } from "next/server";
import { getReminderPreferences, saveReminderPreferences } from "@/lib/data/store";

export async function GET() {
  return NextResponse.json(await getReminderPreferences());
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const current = await getReminderPreferences();
  const updated = {
    ...current,
    enabledTypes: Array.isArray(body.enabledTypes) ? body.enabledTypes : current.enabledTypes,
    preferredHour: typeof body.preferredHour === "number" ? body.preferredHour : current.preferredHour,
  };
  await saveReminderPreferences(updated);
  return NextResponse.json(updated);
}
