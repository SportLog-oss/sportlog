import assert from "node:assert/strict";
import test from "node:test";
import type { ActivityStatisticSection } from "./types";

const moduleUrl = new URL("./activityDetails.ts", import.meta.url);
const { buildActivityStatistics, buildImportedTrainingLog, computeActivitySeries } = await import(moduleUrl.href);

function itemValue(sections: ActivityStatisticSection[], key: string): string | undefined {
  return sections.flatMap((section) => section.items).find((item) => item.key === key)?.value;
}

test("maps real rowing telemetry and derives 500 m pace and stroke distance", () => {
  const [point] = computeActivitySeries([
    { elapsed_time: 15, enhanced_speed: 14.4, cadence: 24, distance: 0.06, heart_rate: 148 },
  ], "rowing");
  assert.equal(point.rowingPaceSecondsPer500, 125);
  assert.equal(point.strokeDistanceM, 10);
  assert.equal(point.distanceKm, 0.06);
});

test("maps running dynamics with FIT scaling", () => {
  const [point] = computeActivitySeries([
    { timer_time: 30, enhanced_speed: 12, cadence: 82, fractional_cadence: 0.2734375, stance_time: 245, step_length: 1180, vertical_oscillation: 92, vertical_ratio: 7.8 },
  ], "running");
  assert.equal(point.paceSecondsPerKm, 300);
  assert.equal(point.groundContactTimeMs, 245);
  assert.equal(point.strideLengthM, 1.18);
  assert.equal(point.verticalOscillationCm, 9.2);
  assert.equal(point.cadence, 164.546875);
});

test("keeps sparse cycling telemetry sparse instead of inventing categories", () => {
  const [point] = computeActivitySeries([{ elapsed_time: 0, power: 260 }], "cycling");
  assert.equal(point.power, 260);
  assert.equal(point.heartRate, null);
  assert.equal(point.temperatureC, null);
});

test("statistics only contain fields that actually exist", () => {
  const sections = buildActivityStatistics(
    {
      activityId: 1,
      activityName: "Test",
      activityType: "CYCLING",
      distanceInMeters: 40000,
      durationInSeconds: 3600,
      activeKilocalories: 700,
      startTimeInSeconds: 1,
    },
    { activity: { avgPower: 220 } },
    undefined
  ) as ActivityStatisticSection[];
  assert.ok(sections.some((section) => section.key === "overview"));
  assert.ok(sections.some((section) => section.key === "power"));
  assert.ok(!sections.some((section) => section.key === "running-dynamics"));
  assert.ok(!sections.some((section) => section.key === "temperature"));
  assert.ok(!sections.some((section) => section.key === "rowing"));
});

test("uses Garmin rowing units and Garmin load at the mapping source", () => {
  const sections = buildActivityStatistics(
    {
      activityId: 1,
      activityName: "Rowing",
      activityType: "ROWING_V2",
      distanceInMeters: 16002.8,
      durationInSeconds: 5216,
      activeKilocalories: 1117,
      startTimeInSeconds: 1,
    },
    { activity: { sportType: "Rowing", trainingLoad: 124.353, avgCadence: 18.5 } },
    {
      total_timer_time: 5216.439,
      total_elapsed_time: 5216.439,
      total_distance: 16.0028,
      enhanced_avg_speed: 11.0448,
      enhanced_max_speed: 13.2156,
      avg_cadence: 18,
      avg_fractional_cadence: 0.484375,
      max_cadence: 29,
      total_cycles: 1509,
      avg_stroke_distance: 0.01071,
      training_load_peak: 248.1,
      total_calories: 1117,
      resting_calories: 129,
    }
  ) as ActivityStatisticSection[];
  assert.equal(itemValue(sections, "avg-rowing-pace"), "2:43 /500 m");
  assert.equal(itemValue(sections, "stroke-distance"), "10,71 m");
  assert.equal(itemValue(sections, "training-load"), "248,1");
  assert.equal(itemValue(sections, "active-calories"), "988 kcal");
  assert.ok(!sections.some((section) => section.key === "running-dynamics"));
  assert.ok(!sections.some((section) => section.key === "elevation"));
});

test("marks Garmin RPE as imported so it is not requested twice", () => {
  const imported = buildImportedTrainingLog(
    { activity: { rpe: null, trainingLoad: 124.353 } },
    { workout_rpe: 4, workout_feel: 75, training_load_peak: 248.1 }
  );
  assert.equal(imported.rpe, 4);
  assert.equal(imported.items.find((item: { key: string }) => item.key === "load")?.value, "248,1");
});

test("handles long activities without dropping or reordering samples", () => {
  const records = Array.from({ length: 10_000 }, (_, index) => ({
    elapsed_time: index * 15,
    distance: index * 0.05,
    heart_rate: 120 + (index % 50),
  }));
  const series = computeActivitySeries(records, "cycling");
  assert.equal(series.length, 10_000);
  assert.equal(series.at(-1)?.t, 149_985);
  assert.ok(Math.abs((series.at(-1)?.distanceKm ?? 0) - 499.95) < 1e-9);
});
