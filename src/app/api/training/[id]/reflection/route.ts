import { NextRequest, NextResponse } from "next/server";
import { planningError, trainingReflectionInputSchema } from "@/lib/planning";
import { getTrainingReflectionByActivityId, PlanningMatchConflictError, saveTrainingReflectionByActivityId } from "@/lib/data/planningMatchStore";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await getTrainingReflectionByActivityId(Number(id)));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = trainingReflectionInputSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json(planningError(parsed.error), { status: 400 });
  try {
    return NextResponse.json(await saveTrainingReflectionByActivityId(Number(id), parsed.data));
  } catch (error) {
    if (error instanceof PlanningMatchConflictError) return NextResponse.json({ error: { code: "PLANNING_CONFLICT", message: error.message } }, { status: 409 });
    throw error;
  }
}
