import type { CalendarEvent } from "@/lib/types";

// Raw shapes as returned by the AthleteData MCP tools `apple_calendar_get_events` and
// `google_calendar_get_events`. Both are external, third-party response formats — kept narrow
// and separate from CalendarEvent so a field AthleteData adds or renames doesn't quietly change
// our own type. `free`/`canceled`/`selfIs*` are only present "when the iPhone app is recent"
// (per the tool's own description), so they stay optional here.
export type AppleCalendarEvent = {
  id: string;
  title: string;
  allDay: boolean;
  startIso: string;
  endIso: string;
  calendar: string;
  free?: boolean;
  canceled?: boolean;
  selfIsOrganizer?: boolean;
  selfIsAttendee?: boolean;
  selfResponse?: string;
};

export type GoogleCalendarEventTime = { date?: string; dateTime?: string };
export type GoogleCalendarEvent = {
  id: string;
  status?: string;
  summary?: string;
  start: GoogleCalendarEventTime;
  end: GoogleCalendarEventTime;
  transparency?: string;
  organizer?: { self?: boolean };
  attendees?: { self?: boolean; responseStatus?: string }[];
};
export type GoogleCalendarResponse = { summary: string; items: GoogleCalendarEvent[] };

/** Maps one Apple Calendar event (via AthleteData) to a calendar_events row. */
export function mapAppleEvent(event: AppleCalendarEvent, syncedAt: string): Omit<CalendarEvent, "id"> {
  return {
    source: "apple",
    externalEventId: event.id,
    calendarName: event.calendar,
    title: event.title,
    startsAt: event.startIso,
    endsAt: event.endIso,
    allDay: event.allDay,
    isFree: event.free ?? false,
    isCanceled: event.canceled ?? false,
    selfIsOrganizer: event.selfIsOrganizer ?? null,
    selfIsAttendee: event.selfIsAttendee ?? null,
    selfResponse: event.selfResponse ?? null,
    lastSyncedAt: syncedAt,
  };
}

function googleEventTime(time: GoogleCalendarEventTime): { at: string; allDay: boolean } {
  if (time.dateTime) return { at: time.dateTime, allDay: false };
  return { at: `${time.date}T00:00:00.000Z`, allDay: true };
}

/**
 * Maps one Google Calendar event to a calendar_events row. `calendarName` comes from the
 * containing calendar's own `summary` (the Google API response's top-level field), which is a
 * different value from the event's own `summary` (its title).
 */
export function mapGoogleEvent(event: GoogleCalendarEvent, calendarName: string, syncedAt: string): Omit<CalendarEvent, "id"> {
  const start = googleEventTime(event.start);
  const end = googleEventTime(event.end);
  const selfAttendee = event.attendees?.find((attendee) => attendee.self);
  return {
    source: "google",
    externalEventId: event.id,
    calendarName,
    title: event.summary ?? "",
    startsAt: start.at,
    endsAt: end.at,
    allDay: start.allDay,
    isFree: event.transparency === "transparent",
    isCanceled: event.status === "cancelled",
    selfIsOrganizer: event.organizer ? Boolean(event.organizer.self) : null,
    selfIsAttendee: event.attendees ? Boolean(selfAttendee) : null,
    selfResponse: selfAttendee?.responseStatus ?? null,
    lastSyncedAt: syncedAt,
  };
}
