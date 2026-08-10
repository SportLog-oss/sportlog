import { NextRequest, NextResponse } from "next/server";
import { planningError, planningWeekDuplicateSchema } from "@/lib/planning";
import { duplicatePlanningWeek, PlanningConflictError } from "@/lib/data/planningStore";

export async function POST(req: NextRequest) {
  const parsed = planningWeekDuplicateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json(planningError(parsed.error), { status: 400 });
  try {
    return NextResponse.json(await duplicatePlanningWeek(parsed.data.sourceWeekStart, parsed.data.targetWeekStart), { status: 201 });
  } catch (error) {
    if (error instanceof PlanningConflictError) return NextResponse.json({ error: { code: "PLANNING_CONFLICT", message: error.message } }, { status: 409 });
    throw error;
  }
}
