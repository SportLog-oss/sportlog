import { NextRequest, NextResponse } from "next/server";
import { planningError, trainingReflectionInputSchema } from "@/lib/planning";
import { PlanningMatchConflictError, saveTrainingReflection } from "@/lib/data/planningMatchStore";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; workoutId: string }> }) {
  const { id, workoutId } = await params;
  const parsed = trainingReflectionInputSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json(planningError(parsed.error), { status: 400 });
  try {
    return NextResponse.json(await saveTrainingReflection(id, workoutId, parsed.data));
  } catch (error) {
    if (error instanceof PlanningMatchConflictError) return NextResponse.json({ error: { code: "PLANNING_CONFLICT", message: error.message } }, { status: 409 });
    throw error;
  }
}
