import assert from "node:assert/strict";
import test from "node:test";
import type { DailyMetricRow } from "./types";

const moduleUrl = new URL("./loadRecovery.ts", import.meta.url);
const { assessLoadRecovery } = await import(moduleUrl.href);

function row(index: number, overrides: Partial<DailyMetricRow> = {}): DailyMetricRow {
  return {
    date: `2026-07-${String(index + 1).padStart(2, "0")}`,
    ctl: 50 + index * 0.3,
    atl: 52,
    tsb: -2,
    rampRate: null,
    dailyLoad: 80,
    restingHr: null,
    hrv: null,
    weight: null,
    bodyFat: null,
    sleepDurationMin: null,
    sleepScore: null,
    readinessScore: null,
    recoveryScore: null,
    readinessScoreV2: null,
    readinessVerdict: null,
    readinessDrivers: [],
    injuryRiskIndex: null,
    injuryRiskDrivers: [],
    acwr: null,
    monotony: null,
    strainFoster: null,
    sportLoadSplit: {},
    hrvBaseline60d: null,
    hrvZScore: null,
    rhrBaseline60d: null,
    rhrZScore: null,
    sleepNeedMin: null,
    sleepDebtMin: null,
    anomalies: null,
    ...overrides,
  };
}

test("does not make a confident statement with too little history", () => {
  const assessment = assessLoadRecovery([row(0), row(1)], 1);
  assert.equal(assessment.reliable, false);
  assert.match(assessment.headline, /nicht genügend Daten/);
});

test("explains high short-term load and reduced form in plain German", () => {
  const rows = Array.from({ length: 10 }, (_, index) => row(index));
  rows[9] = row(9, { ctl: 50, atl: 72, tsb: -22, dailyLoad: 140 });
  const assessment = assessLoadRecovery(rows, 9);
  assert.equal(assessment.reliable, true);
  assert.ok(assessment.statements.some((statement: string) => statement.includes("Hohe kurzfristige Belastung")));
  assert.ok(assessment.statements.some((statement: string) => statement.includes("Erholung")));
});
