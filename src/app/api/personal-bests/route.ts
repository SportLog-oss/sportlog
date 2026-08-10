import { NextResponse } from "next/server";
import { getPersonalBests } from "@/lib/data/store";

// Read-only: personal_bests rows are only ever written by the automatic detection in
// src/lib/sync.ts, never by direct user input — unlike the manually-entered benchmarks route.
export async function GET() {
  return NextResponse.json(await getPersonalBests());
}
