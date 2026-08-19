import assert from "node:assert/strict";
import test from "node:test";
import type { PlannedSession, PlanningWorkoutMatch, TrainingReflection } from "./planning";
import {
  buildPlanningDayLoads,
  buildReflectionDraft,
  buildReflectionPayload,
  emptySessionDraft,
  planningMinutesLabel,
  trainingFeelingFromScore,
} from "./planningPresentation.ts";

function session(overrides: Partial<PlannedSession> = {}): PlannedSession {
  return {
    id: "session-1",
    scheduledDate: "2026-08-17",
    timeOfDay: "afternoon",
    scheduledAt: null,
    sportType: "Rudern",
    title: "Training",
    plannedDurationMin: 60,
    plannedIntensity: "easy",
    description: "",
    technicalFocus: "",
    trainerNote: "",
    goalId: null,
    raceId: null,
    status: "planned",
    changeReason: null,
    movedFromDate: null,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

test("creates a predictable default draft", () => {
  assert.deepEqual(emptySessionDraft("2026-08-18"), {
    scheduledDate: "2026-08-18",
    title: "",
    sportType: "Rudern",
    plannedDurationMin: "",
    plannedIntensity: "easy",
    timeOfDay: "afternoon",
    description: "",
  });
});

test("formats planned duration in plain German", () => {
  assert.equal(planningMinutesLabel(45), "45 min");
  assert.equal(planningMinutesLabel(60), "1 h");
  assert.equal(planningMinutesLabel(150), "2 h 30 min");
});

test("maps Garmin feeling boundaries consistently", () => {
  assert.equal(trainingFeelingFromScore(null), null);
  assert.equal(trainingFeelingFromScore(19), "bad");
  assert.equal(trainingFeelingFromScore(20), "hard");
  assert.equal(trainingFeelingFromScore(40), "okay");
  assert.equal(trainingFeelingFromScore(60), "good");
  assert.equal(trainingFeelingFromScore(80), "great");
});

test("calculates daily load and ignores cancelled sessions", () => {
  const loads = buildPlanningDayLoads(
    ["2026-08-17", "2026-08-18"],
    [
      session(),
      session({ id: "session-2", plannedDurationMin: 30, plannedIntensity: "hard" }),
      session({ id: "session-3", status: "cancelled", plannedDurationMin: 240, plannedIntensity: "competition" }),
    ],
  );

  assert.deepEqual(loads[0], {
    day: "2026-08-17",
    score: 63,
    sessions: 2,
    strongest: "hard",
  });
  assert.deepEqual(loads[1], {
    day: "2026-08-18",
    score: 0,
    sessions: 0,
    strongest: null,
  });
});

test("uses documented defaults when duration or intensity is open", () => {
  const [load] = buildPlanningDayLoads(
    ["2026-08-17"],
    [session({ plannedDurationMin: null, plannedIntensity: null })],
  );
  assert.equal(load.score, 27);
});

function match(overrides: Partial<PlanningWorkoutMatch> = {}): PlanningWorkoutMatch {
  return {
    plannedSessionId: "session-1",
    workoutId: "workout-1",
    status: "confirmed",
    score: 1,
    reasons: [],
    reflection: null,
    postWorkoutLog: null,
    workout: {
      externalId: "ext-1",
      title: "Rudern",
      workoutType: "rowing",
      source: "garmin",
      startedAt: "2026-08-17T07:00:00Z",
      durationSeconds: 3600,
      distanceMeters: 10000,
      importedRpe: null,
      importedFeel: null,
    },
    ...overrides,
  };
}

function reflection(overrides: Partial<TrainingReflection> = {}): TrainingReflection {
  return {
    feeling: null,
    perceivedExertion: null,
    deviationReason: null,
    note: "",
    updatedAt: "2026-08-17T08:00:00Z",
    ...overrides,
  };
}

test("builds a fresh reflection draft from Garmin-imported values when nothing was saved yet", () => {
  const draft = buildReflectionDraft(
    match({ workout: { ...match().workout, importedRpe: 7, importedFeel: 65 } }),
    null,
  );
  assert.deepEqual(draft, {
    plannedSessionId: "session-1",
    workoutId: "workout-1",
    feeling: "good",
    perceivedExertion: "7",
    deviationReason: "",
    note: "",
  });
});

test("builds an empty reflection draft when neither a saved entry nor Garmin values exist", () => {
  const draft = buildReflectionDraft(match(), null);
  assert.deepEqual(draft, {
    plannedSessionId: "session-1",
    workoutId: "workout-1",
    feeling: "",
    perceivedExertion: "",
    deviationReason: "",
    note: "",
  });
});

test("builds a reflection draft from a saved entry, preferring saved values over Garmin fallbacks", () => {
  const draft = buildReflectionDraft(
    match({ workout: { ...match().workout, importedRpe: 7, importedFeel: 65 } }),
    reflection({ feeling: "hard", perceivedExertion: 9, deviationReason: "felt-tired", note: "Beine schwer" }),
  );
  assert.deepEqual(draft, {
    plannedSessionId: "session-1",
    workoutId: "workout-1",
    feeling: "hard",
    perceivedExertion: "9",
    deviationReason: "felt-tired",
    note: "Beine schwer",
  });
});

test("saved reflection draft falls back to Garmin values for fields left empty", () => {
  const draft = buildReflectionDraft(
    match({ workout: { ...match().workout, importedRpe: 7, importedFeel: 65 } }),
    reflection({ feeling: null, perceivedExertion: null, deviationReason: null, note: "Nur eine Notiz" }),
  );
  assert.deepEqual(draft, {
    plannedSessionId: "session-1",
    workoutId: "workout-1",
    feeling: "good",
    perceivedExertion: "7",
    deviationReason: "",
    note: "Nur eine Notiz",
  });
});

test("reflection payload lets Garmin-imported values win over the free-text draft", () => {
  const payload = buildReflectionPayload(
    { feeling: "okay", perceivedExertion: "5", deviationReason: "schedule", note: "Zeitdruck" },
    { rpe: 8, feel: 70 },
  );
  assert.deepEqual(payload, {
    feeling: "good",
    perceivedExertion: 8,
    deviationReason: "schedule",
    note: "Zeitdruck",
  });
});

test("reflection payload uses the free-text draft when no Garmin values were imported", () => {
  const payload = buildReflectionPayload(
    { feeling: "okay", perceivedExertion: "5", deviationReason: "", note: "Solide" },
    { rpe: null, feel: null },
  );
  assert.deepEqual(payload, {
    feeling: "okay",
    perceivedExertion: 5,
    deviationReason: null,
    note: "Solide",
  });
});

test("reflection payload turns empty draft fields into null instead of NaN or empty strings", () => {
  const payload = buildReflectionPayload(
    { feeling: "", perceivedExertion: "", deviationReason: "", note: "" },
    { rpe: null, feel: null },
  );
  assert.deepEqual(payload, {
    feeling: null,
    perceivedExertion: null,
    deviationReason: null,
    note: "",
  });
});
