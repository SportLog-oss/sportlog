import assert from "node:assert/strict";
import test from "node:test";

const concept2ModuleUrl = new URL("./concept2.ts", import.meta.url);
const { calculateConcept2Pace, formatConcept2Time, parseConcept2Time } = await import(concept2ModuleUrl.href);

test("calculates time and watts from distance and split", () => {
  const result = calculateConcept2Pace({ distanceMeters: 2000, splitSecondsPer500: 110 });
  assert.equal(result.totalSeconds, 440);
  assert.ok(Math.abs(result.watts - 262.96018031555214) < 1e-9);
});

test("calculates split from distance and total time", () => {
  const result = calculateConcept2Pace({ distanceMeters: 2000, totalSeconds: 420 });
  assert.equal(result.splitSecondsPer500, 105);
  assert.ok(Math.abs(result.watts - 302.3431594866641) < 1e-9);
});

test("calculates distance from split and total time", () => {
  const result = calculateConcept2Pace({ splitSecondsPer500: 120, totalSeconds: 1800 });
  assert.equal(result.distanceMeters, 7500);
});

test("requires exactly two values", () => {
  assert.throws(() => calculateConcept2Pace({ distanceMeters: 2000 }));
  assert.throws(() => calculateConcept2Pace({ distanceMeters: 2000, splitSecondsPer500: 110, totalSeconds: 440 }));
});

test("parses and formats Concept2 time values", () => {
  assert.equal(parseConcept2Time("1:50.5"), 110.5);
  assert.equal(parseConcept2Time("110,5"), 110.5);
  assert.equal(parseConcept2Time("1:60"), undefined);
  assert.equal(formatConcept2Time(110.5), "1:50.5");
});
