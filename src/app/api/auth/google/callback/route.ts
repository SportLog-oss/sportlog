import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode, fetchGoogleAccountEmail } from "@/lib/googleCalendar";
import { saveGoogleCalendarConnection } from "@/lib/data/store";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;

  if (error || !code) {
    return NextResponse.redirect(new URL(`/profil?google=error`, req.url));
  }

  try {
    const tokens = await exchangeGoogleCode(code, redirectUri);
    if (!tokens.refresh_token) {
      // Happens if the user has already granted consent before and Google skips issuing a new
      // refresh token even with prompt=consent in rare cases — without one we can't sync later.
      return NextResponse.redirect(new URL(`/profil?google=error`, req.url));
    }
    const googleEmail = await fetchGoogleAccountEmail(tokens.access_token);
    await saveGoogleCalendarConnection({
      googleEmail,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      needsReauth: false,
    });
    return NextResponse.redirect(new URL(`/profil?google=connected`, req.url));
  } catch {
    return NextResponse.redirect(new URL(`/profil?google=error`, req.url));
  }
}
