// Eigenständige SportLog-Google-Calendar-OAuth-Anbindung (Teil 7, 01.09.2026) — bewusst getrennt
// von der AthleteData-Google-Kalender-Verbindung, eigenes Google-Cloud-Projekt. Nur Lesezugriff.

import type { GoogleCalendarResponse } from "@/lib/calendarSync";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

// email/userinfo.email so the "verbundenes Konto"-Anzeige den Google-Account nennen kann —
// rein informativ, nicht Teil der eigentlichen Kalenderzugriffsberechtigung.
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/userinfo.email"];

function credentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("GOOGLE_CALENDAR_CLIENT_ID/SECRET sind nicht gesetzt.");
  return { clientId, clientSecret };
}

export function buildGoogleAuthUrl(redirectUri: string): string {
  const { clientId } = credentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    // Ensures a refresh_token is returned even on a reconnect after a previous grant.
    prompt: "consent",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

async function postToken(body: URLSearchParams): Promise<GoogleTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google-Token-Anfrage fehlgeschlagen (${response.status}): ${detail}`);
  }
  return response.json();
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = credentials();
  return postToken(
    new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    })
  );
}

export class GoogleReauthRequiredError extends Error {}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = credentials();
  try {
    return await postToken(
      new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      })
    );
  } catch (error) {
    // Google returns invalid_grant when a refresh token was revoked or (in Testing publishing
    // status) expired after 7 days — that specific case means "the user must reconnect", not a
    // transient failure worth retrying.
    if (error instanceof Error && error.message.includes("invalid_grant")) {
      throw new GoogleReauthRequiredError("Google-Kalender-Verbindung abgelaufen, bitte erneut verbinden.");
    }
    throw error;
  }
}

export async function fetchGoogleAccountEmail(accessToken: string): Promise<string | null> {
  const response = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) return null;
  const data = (await response.json()) as { email?: string };
  return data.email ?? null;
}

export async function revokeGoogleToken(token: string): Promise<void> {
  await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => undefined);
}

export async function fetchGoogleCalendarEvents(accessToken: string, timeMinIso: string): Promise<GoogleCalendarResponse> {
  const params = new URLSearchParams({
    timeMin: timeMinIso,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  });
  const response = await fetch(`${GOOGLE_CALENDAR_EVENTS_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google-Calendar-Abruf fehlgeschlagen (${response.status}): ${detail}`);
  }
  return response.json();
}
