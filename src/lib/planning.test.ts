import assert from "node:assert/strict";
import test from "node:test";
import { addDays, mondayForDate, plannedSessionCreateSchema, planningWeekInputSchema, trainingReflectionInputSchema } from "./planning.ts";

test("mondayForDate returns the ISO week Monday", () => {
  assert.equal(mondayForDate("2026-08-03"), "2026-08-03");
  assert.equal(mondayForDate("2026-08-09"), "2026-08-03");
});

test("addDays remains stable across month boundaries", () => {
  assert.equal(addDays("2026-08-31", 6), "2026-09-06");
});

test("week input rejects a non-Monday", () => {
  assert.equal(planningWeekInputSchema.safeParse({ weekStart: "2026-08-04" }).success, false);
});

test("session input rejects unknown fields and invalid duration", () => {
  assert.equal(plannedSessionCreateSchema.safeParse({ scheduledDate: "2026-08-03", sportType: "rowing", title: "Technik", plannedDurationMin: 0 }).success, false);
  assert.equal(plannedSessionCreateSchema.safeParse({ scheduledDate: "2026-08-03", sportType: "rowing", title: "Technik", hidden: true }).success, false);
});

test("session input accepts the minimal contract", () => {
  assert.equal(plannedSessionCreateSchema.safeParse({ scheduledDate: "2026-08-03", sportType: "rowing", title: "Technik" }).success, true);
});

test("reflection accepts a useful partial entry", () => {
  assert.equal(trainingReflectionInputSchema.safeParse({ feeling: "good", perceivedExertion: 7, deviationReason: null, note: "Solide Einheit" }).success, true);
});

test("reflection rejects empty and out-of-range entries", () => {
  assert.equal(trainingReflectionInputSchema.safeParse({ feeling: null, perceivedExertion: null, deviationReason: null, note: "" }).success, false);
  assert.equal(trainingReflectionInputSchema.safeParse({ feeling: "good", perceivedExertion: 11, deviationReason: null, note: "" }).success, false);
});
