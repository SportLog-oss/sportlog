import { NextRequest, NextResponse } from "next/server";
import { planningError, planningMatchInputSchema } from "@/lib/planning";
import { PlanningMatchConflictError, setPlanningMatch } from "@/lib/data/planningMatchStore";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = planningMatchInputSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json(planningError(parsed.error), { status: 400 });
  try { return NextResponse.json(await setPlanningMatch(id, parsed.data)); }
  catch (error) { if (error instanceof PlanningMatchConflictError) return NextResponse.json({ error: { code: "PLANNING_CONFLICT", message: error.message } }, { status: 409 }); throw error; }
}
