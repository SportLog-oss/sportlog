import { NextResponse } from "next/server";
import { removePlanningMatch } from "@/lib/data/planningMatchStore";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; workoutId: string }> }) {
  const { id, workoutId } = await params;
  return NextResponse.json(await removePlanningMatch(id, workoutId));
}
