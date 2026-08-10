import { NextResponse } from "next/server";
import { buildTodayResponse } from "@/lib/today";

export async function GET() {
  return NextResponse.json(await buildTodayResponse());
}
