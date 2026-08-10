import { NextRequest, NextResponse } from "next/server";
import { plannedSessionDuplicateSchema, planningError } from "@/lib/planning";
import { duplicatePlannedSession } from "@/lib/data/planningStore";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = plannedSessionDuplicateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json(planningError(parsed.error), { status: 400 });
  const session = await duplicatePlannedSession(id, parsed.data.scheduledDate);
  return session
    ? NextResponse.json(session, { status: 201 })
    : NextResponse.json({ error: { code: "NOT_FOUND", message: "Geplante Einheit nicht gefunden." } }, { status: 404 });
}
