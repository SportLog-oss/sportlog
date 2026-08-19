import assert from "node:assert/strict";
import test from "node:test";
import { mapAppleEvent, mapGoogleEvent, type AppleCalendarEvent, type GoogleCalendarEvent } from "./calendarSync.ts";

const SYNCED_AT = "2026-08-19T12:00:00.000Z";

test("maps a minimal Apple event, defaulting absent relevance signals to real/not-cancelled", () => {
  const event: AppleCalendarEvent = {
    id: "apple-1",
    title: "Training",
    allDay: false,
    startIso: "2026-08-20T16:00:00.000Z",
    endIso: "2026-08-20T17:30:00.000Z",
    calendar: "Verein",
  };
  assert.deepEqual(mapAppleEvent(event, SYNCED_AT), {
    source: "apple",
    externalEventId: "apple-1",
    calendarName: "Verein",
    title: "Training",
    startsAt: "2026-08-20T16:00:00.000Z",
    endsAt: "2026-08-20T17:30:00.000Z",
    allDay: false,
    isFree: false,
    isCanceled: false,
    selfIsOrganizer: null,
    selfIsAttendee: null,
    selfResponse: null,
    lastSyncedAt: SYNCED_AT,
  });
});

test("carries the recent-app relevance signals from an Apple event when present", () => {
  const event: AppleCalendarEvent = {
    id: "apple-2",
    title: "Familientermin",
    allDay: false,
    startIso: "2026-08-21T09:00:00.000Z",
    endIso: "2026-08-21T10:00:00.000Z",
    calendar: "Familie",
    free: true,
    canceled: false,
    selfIsOrganizer: false,
    selfIsAttendee: true,
    selfResponse: "accepted",
  };
  const mapped = mapAppleEvent(event, SYNCED_AT);
  assert.equal(mapped.isFree, true);
  assert.equal(mapped.selfIsAttendee, true);
  assert.equal(mapped.selfResponse, "accepted");
});

test("maps a timed Google event and reads free/busy from transparency", () => {
  const event: GoogleCalendarEvent = {
    id: "google-1",
    status: "confirmed",
    summary: "Zahnarzt",
    start: { dateTime: "2026-08-22T08:00:00+02:00" },
    end: { dateTime: "2026-08-22T08:30:00+02:00" },
    transparency: "opaque",
    organizer: { self: true },
  };
  const mapped = mapGoogleEvent(event, "Tages Ablauf", SYNCED_AT);
  assert.equal(mapped.startsAt, "2026-08-22T08:00:00+02:00");
  assert.equal(mapped.allDay, false);
  assert.equal(mapped.isFree, false);
  assert.equal(mapped.isCanceled, false);
  assert.equal(mapped.calendarName, "Tages Ablauf");
  assert.equal(mapped.selfIsOrganizer, true);
  assert.equal(mapped.selfIsAttendee, null);
});

test("maps an all-day Google event from its date-only start/end", () => {
  const event: GoogleCalendarEvent = {
    id: "google-2",
    summary: "Feiertag",
    start: { date: "2026-08-23" },
    end: { date: "2026-08-24" },
  };
  const mapped = mapGoogleEvent(event, "Tages Ablauf", SYNCED_AT);
  assert.equal(mapped.allDay, true);
  assert.equal(mapped.startsAt, "2026-08-23T00:00:00.000Z");
  assert.equal(mapped.endsAt, "2026-08-24T00:00:00.000Z");
});

test("marks a Google event cancelled by status, independent of transparency", () => {
  const event: GoogleCalendarEvent = {
    id: "google-3",
    status: "cancelled",
    summary: "Abgesagtes Meeting",
    start: { dateTime: "2026-08-24T10:00:00Z" },
    end: { dateTime: "2026-08-24T11:00:00Z" },
  };
  assert.equal(mapGoogleEvent(event, "Tages Ablauf", SYNCED_AT).isCanceled, true);
});

test("reads the caller's own attendee response from the attendees list, not other attendees", () => {
  const event: GoogleCalendarEvent = {
    id: "google-4",
    summary: "Teambesprechung",
    start: { dateTime: "2026-08-25T14:00:00Z" },
    end: { dateTime: "2026-08-25T15:00:00Z" },
    attendees: [
      { self: false, responseStatus: "accepted" },
      { self: true, responseStatus: "declined" },
    ],
  };
  const mapped = mapGoogleEvent(event, "Tages Ablauf", SYNCED_AT);
  assert.equal(mapped.selfIsAttendee, true);
  assert.equal(mapped.selfResponse, "declined");
});

test("treats a Google event with no attendees array as an unknown attendee status, not false", () => {
  const event: GoogleCalendarEvent = {
    id: "google-5",
    summary: "Geburtstag",
    start: { date: "2026-08-26" },
    end: { date: "2026-08-27" },
  };
  const mapped = mapGoogleEvent(event, "Tages Ablauf", SYNCED_AT);
  assert.equal(mapped.selfIsAttendee, null);
  assert.equal(mapped.selfResponse, null);
});
