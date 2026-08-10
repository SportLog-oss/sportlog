import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWeightEntries, recordWeight } from "@/lib/data/store";

const createWeightSchema = z.object({
  weightKg: z.number().min(20).max(400),
  measuredOn: z.iso.date(),
  measuredAt: z.iso.datetime().optional(),
});

export async function GET(req: NextRequest) {
  const requestedLimit = Number(req.nextUrl.searchParams.get("limit") ?? 365);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 1000) : 365;
  return NextResponse.json(await getWeightEntries(limit));
}

export async function POST(req: NextRequest) {
  const parsed = createWeightSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Gewichtsmessung.", issues: parsed.error.issues }, { status: 400 });
  }

  const entry = await recordWeight(parsed.data.weightKg, parsed.data.measuredOn, parsed.data.measuredAt);
  return NextResponse.json(entry, { status: 201 });
}
