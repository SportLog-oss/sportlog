import { NextRequest, NextResponse } from "next/server";
import { registerPushToken } from "@/lib/push";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }
  await registerPushToken(token);
  return NextResponse.json({ ok: true });
}
