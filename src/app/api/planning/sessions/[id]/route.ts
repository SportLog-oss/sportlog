import { NextRequest, NextResponse } from "next/server";
import { plannedSessionPatchSchema, planningError } from "@/lib/planning";
import { deletePlannedSession, PlanningReferenceError, updatePlannedSession } from "@/lib/data/planningStore";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = plannedSessionPatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json(planningError(parsed.error), { status: 400 });
  try {
    const session = await updatePlannedSession(id, parsed.data);
    return session ? NextResponse.json(session) : NextResponse.json({ error: { code: "NOT_FOUND", message: "Geplante Einheit nicht gefunden." } }, { status: 404 });
  } catch (error) {
    if (error instanceof PlanningReferenceError) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Ziel oder Wettkampf nicht gefunden." } }, { status: 404 });
    throw error;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return await deletePlannedSession(id)
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: { code: "NOT_FOUND", message: "Geplante Einheit nicht gefunden." } }, { status: 404 });
  } catch (error) {
    console.error("planned session delete failed", error);
    return NextResponse.json({ error: { code: "DELETE_FAILED", message: "Die Einheit konnte nicht gelöscht werden. Bitte versuche es erneut." } }, { status: 500 });
  }
}
