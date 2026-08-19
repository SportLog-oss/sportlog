import assert from "node:assert/strict";
import test from "node:test";
import type { CompetitionResult } from "./types";
import {
  competitionToEditForm,
  formatDistance,
  formatDuration,
  formatOfficialTime,
  parseOfficialTime,
  parseSplits,
} from "./competitionsPresentation.ts";

test("parses official times in m:ss and h:mm:ss form, with a comma or dot decimal", () => {
  assert.equal(parseOfficialTime("6:42,18"), 402.18);
  assert.equal(parseOfficialTime("6:42.18"), 402.18);
  assert.equal(parseOfficialTime("1:06:42"), 4002);
  assert.equal(parseOfficialTime("45"), 45);
});

test("rejects empty, non-numeric or overly long official times", () => {
  assert.equal(parseOfficialTime(""), null);
  assert.equal(parseOfficialTime("   "), null);
  assert.equal(parseOfficialTime("DNF"), null);
  assert.equal(parseOfficialTime("0"), null);
  assert.equal(parseOfficialTime("1:2:3:4"), null);
});

test("formats official times back into German race-clock notation", () => {
  assert.equal(formatOfficialTime(null), "–");
  assert.equal(formatOfficialTime(402.18), "6:42,18");
  assert.equal(formatOfficialTime(65), "1:05,00");
});

test("parses splits and keeps the time's own colon intact", () => {
  assert.deepEqual(parseSplits("500m: 1:38,4\n1000m: 3:20,1\n\nkeine-zeit"), [
    { split: "500m", time: "1:38,4" },
    { split: "1000m", time: "3:20,1" },
    { split: "keine-zeit", time: "" },
  ]);
  assert.deepEqual(parseSplits(""), []);
});

test("formats durations as hours+minutes or minutes:seconds", () => {
  assert.equal(formatDuration(null), "–");
  assert.equal(formatDuration(0), "–");
  assert.equal(formatDuration(125), "2:05 min");
  assert.equal(formatDuration(4500), "1 h 15 min");
});

test("formats distances in meters or kilometers", () => {
  assert.equal(formatDistance(null), "–");
  assert.equal(formatDistance(0), "–");
  assert.equal(formatDistance(750), "750 m");
  assert.equal(formatDistance(12500), "12,5 km");
});

function competition(overrides: Partial<CompetitionResult> = {}): CompetitionResult {
  return {
    id: "comp-1",
    status: "completed",
    name: "Münchner Regatta",
    date: "2026-09-05",
    location: "Oberschleißheim",
    distanceMeters: 2000,
    boatClass: "1x",
    crew: "",
    goal: "Top 3",
    result: "6:42,18",
    placement: 2,
    splits: [{ split: "500m", time: "1:38,4" }],
    avgHeartRate: 172,
    weather: "sonnig",
    wind: "leichter Gegenwind",
    notes: "Guter Start",
    analysis: null,
    createdAt: "2026-08-01T00:00:00Z",
    races: [],
    ...overrides,
  };
}

test("builds the edit form draft from a competition, stringifying nullable numeric fields", () => {
  const draft = competitionToEditForm(competition());
  assert.deepEqual(draft, {
    name: "Münchner Regatta",
    date: "2026-09-05",
    location: "Oberschleißheim",
    boatClass: "1x",
    crew: "",
    goal: "Top 3",
    distanceMeters: "2000",
    result: "6:42,18",
    placement: "2",
    avgHeartRate: "172",
    weather: "sonnig",
    wind: "leichter Gegenwind",
    notes: "Guter Start",
    splitsRaw: "500m: 1:38,4",
  });
});

test("edit form draft falls back to defaults for a missing distance and null placement/heart rate", () => {
  const draft = competitionToEditForm(competition({ distanceMeters: 0, placement: null, avgHeartRate: null, splits: [] }));
  assert.equal(draft.distanceMeters, "0");
  assert.equal(draft.placement, "");
  assert.equal(draft.avgHeartRate, "");
  assert.equal(draft.splitsRaw, "");
});
