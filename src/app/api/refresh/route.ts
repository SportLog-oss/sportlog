import { NextRequest, NextResponse } from "next/server";
import { runSync } from "@/lib/sync";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get("scope") === "activities" ? "activities" : "all";
  const result = await runSync({ notify: false, scope });
  return NextResponse.json(result);
}
