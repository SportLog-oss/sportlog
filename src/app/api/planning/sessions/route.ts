import { NextRequest, NextResponse } from "next/server";
import { plannedSessionCreateSchema, planningError } from "@/lib/planning";
import { createPlannedSession, PlanningReferenceError } from "@/lib/data/planningStore";

export async function POST(req: NextRequest) {
  const parsed = plannedSessionCreateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json(planningError(parsed.error), { status: 400 });
  try {
    return NextResponse.json(await createPlannedSession(parsed.data), { status: 201 });
  } catch (error) {
    if (error instanceof PlanningReferenceError) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Ziel oder Wettkampf nicht gefunden." } }, { status: 404 });
    throw error;
  }
}
