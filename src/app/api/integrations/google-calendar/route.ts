import { NextResponse } from "next/server";
import { deleteGoogleCalendarConnection, getGoogleCalendarConnection } from "@/lib/data/store";
import { revokeGoogleToken } from "@/lib/googleCalendar";
import type { GoogleCalendarStatus } from "@/lib/types";

export async function GET() {
  const connection = await getGoogleCalendarConnection();
  const status: GoogleCalendarStatus = connection
    ? { connected: true, googleEmail: connection.googleEmail, connectedAt: connection.connectedAt, needsReauth: connection.needsReauth }
    : { connected: false };
  return NextResponse.json(status);
}

export async function DELETE() {
  const connection = await getGoogleCalendarConnection();
  if (connection) await revokeGoogleToken(connection.refreshToken);
  await deleteGoogleCalendarConnection();
  return NextResponse.json({ ok: true });
}
