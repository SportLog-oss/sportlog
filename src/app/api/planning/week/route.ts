import { NextRequest, NextResponse } from "next/server";
import { localDateKey } from "@/lib/today";
import { mondayForDate, planningError, planningWeekInputSchema, weekStartSchema } from "@/lib/planning";
import { getPlanningWeek, savePlanningWeek } from "@/lib/data/planningStore";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("start") ?? mondayForDate(localDateKey(new Date()));
  const parsed = weekStartSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json(planningError(parsed.error), { status: 400 });
  return NextResponse.json(await getPlanningWeek(parsed.data));
}

export async function PUT(req: NextRequest) {
  const parsed = planningWeekInputSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json(planningError(parsed.error), { status: 400 });
  return NextResponse.json(await savePlanningWeek(parsed.data));
}
