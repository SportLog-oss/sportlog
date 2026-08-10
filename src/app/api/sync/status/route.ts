import { NextResponse } from "next/server";
import { getAthleteDataSyncStatus } from "@/lib/data/store";

export async function GET() {
  return NextResponse.json(await getAthleteDataSyncStatus());
}
