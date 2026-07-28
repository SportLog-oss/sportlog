import { NextResponse } from "next/server";
import { runSync } from "@/lib/sync";

export const maxDuration = 60;

export async function POST() {
  const result = await runSync({ notify: false });
  return NextResponse.json(result);
}
