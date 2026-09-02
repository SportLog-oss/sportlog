import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthUrl } from "@/lib/googleCalendar";

export async function GET(req: NextRequest) {
  const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;
  return NextResponse.redirect(buildGoogleAuthUrl(redirectUri));
}
