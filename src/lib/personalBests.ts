import type { Activity } from "@/lib/types";

// Standard rowing/ergo PB categories (Batch E). All values are plain numbers — seconds for the
// fixed-distance categories, meters for rowing_30min — never formatted strings, so comparisons
// stay exact regardless of display formatting.
export type PersonalBestCategory =
  | "rowing_500m"
  | "rowing_1000m"
  | "rowing_2000m"
  | "rowing_5000m"
  | "rowing_6000m"
  | "rowing_30min";

export const PB_CATEGORY_META: Record<PersonalBestCategory, { label: string; unit: string; lowerIsBetter: boolean }> = {
  rowing_500m: { label: "500 m", unit: "s", lowerIsBetter: true },
  rowing_1000m: { label: "1000 m", unit: "s", lowerIsBetter: true },
  rowing_2000m: { label: "2000 m", unit: "s", lowerIsBetter: true },
  rowing_5000m: { label: "5000 m", unit: "s", lowerIsBetter: true },
  rowing_6000m: { label: "6000 m", unit: "s", lowerIsBetter: true },
  rowing_30min: { label: "Beste 30 Minuten", unit: "m", lowerIsBetter: false },
};

export const PB_CATEGORY_ORDER: PersonalBestCategory[] = [
  "rowing_500m",
  "rowing_1000m",
  "rowing_2000m",
  "rowing_5000m",
  "rowing_6000m",
  "rowing_30min",
];

const ROWING_ACTIVITY_TYPES = new Set(["ROWING_V2", "INDOOR_ROWING"]);

const DISTANCE_TARGETS_M: { category: PersonalBestCategory; distanceM: number }[] = [
  { category: "rowing_500m", distanceM: 500 },
  { category: "rowing_1000m", distanceM: 1000 },
  { category: "rowing_2000m", distanceM: 2000 },
  { category: "rowing_5000m", distanceM: 5000 },
  { category: "rowing_6000m", distanceM: 6000 },
];
const DISTANCE_TOLERANCE_FRACTION = 0.03; // ±3% of the target distance

const THIRTY_MIN_SECONDS = 30 * 60;
const THIRTY_MIN_TOLERANCE_S = 60; // ±1 minute

export interface PersonalBestCandidate {
  category: PersonalBestCategory;
  value: number;
  activityId: number;
}

export function isBetterPersonalBest(category: PersonalBestCategory, candidateValue: number, existingValue: number): boolean {
  return PB_CATEGORY_META[category].lowerIsBetter ? candidateValue < existingValue : candidateValue > existingValue;
}

// Scans a batch of activities (whole sessions, not sub-splits — no per-point series data is
// available at this stage) for rowing efforts whose total distance/duration lands close enough to
// a standard test to count as an attempt at it, and returns the single best candidate per category
// found in the batch. Callers still need to compare each candidate against the persisted record.
export function findPersonalBestCandidates(activities: Activity[]): PersonalBestCandidate[] {
  const bestInBatch = new Map<PersonalBestCategory, PersonalBestCandidate>();

  function consider(category: PersonalBestCategory, value: number, activityId: number) {
    const existing = bestInBatch.get(category);
    if (!existing || isBetterPersonalBest(category, value, existing.value)) {
      bestInBatch.set(category, { category, value, activityId });
    }
  }

  for (const activity of activities) {
    if (!ROWING_ACTIVITY_TYPES.has(activity.activityType)) continue;
    if (!activity.distanceInMeters || activity.distanceInMeters <= 0) continue;
    if (!activity.durationInSeconds || activity.durationInSeconds <= 0) continue;

    for (const target of DISTANCE_TARGETS_M) {
      const relativeDiff = Math.abs(activity.distanceInMeters - target.distanceM) / target.distanceM;
      if (relativeDiff <= DISTANCE_TOLERANCE_FRACTION) {
        consider(target.category, activity.durationInSeconds, activity.activityId);
      }
    }

    if (Math.abs(activity.durationInSeconds - THIRTY_MIN_SECONDS) <= THIRTY_MIN_TOLERANCE_S) {
      consider("rowing_30min", activity.distanceInMeters, activity.activityId);
    }
  }

  return Array.from(bestInBatch.values());
}
