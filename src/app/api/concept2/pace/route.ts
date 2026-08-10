import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateConcept2Pace } from "@/lib/concept2";

const inputSchema = z.object({
  distanceMeters: z.number().positive().optional(),
  splitSecondsPer500: z.number().positive().optional(),
  totalSeconds: z.number().positive().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = inputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Rechner-Eingabe." }, { status: 400 });
  }

  try {
    return NextResponse.json(calculateConcept2Pace(parsed.data));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Berechnung fehlgeschlagen." },
      { status: 400 }
    );
  }
}
