import { NextRequest, NextResponse } from "next/server";
import { getPlanningMatches } from "@/lib/data/planningMatchStore";
import { planningError, weekStartSchema } from "@/lib/planning";

export async function GET(req: NextRequest) {
  const parsed = weekStartSchema.safeParse(req.nextUrl.searchParams.get("start"));
  if (!parsed.success) return NextResponse.json(planningError(parsed.error), { status: 400 });
  return NextResponse.json(await getPlanningMatches(parsed.data));
}
