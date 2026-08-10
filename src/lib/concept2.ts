export type Concept2PaceInput = {
  distanceMeters?: number;
  splitSecondsPer500?: number;
  totalSeconds?: number;
};

export type Concept2PaceResult = {
  distanceMeters: number;
  splitSecondsPer500: number;
  totalSeconds: number;
  watts: number;
};

const POSITIVE_FIELDS = ["distanceMeters", "splitSecondsPer500", "totalSeconds"] as const;

/**
 * Concept2 RowErg/SkiErg relationships:
 * distance = (time / split) * 500
 * split = 500 * (time / distance)
 * time = split * (distance / 500)
 * watts = 2.8 / (splitSecondsPer500 / 500)^3
 */
export function calculateConcept2Pace(input: Concept2PaceInput): Concept2PaceResult {
  const values = POSITIVE_FIELDS.filter((key) => {
    const value = input[key];
    return typeof value === "number" && Number.isFinite(value) && value > 0;
  });
  if (values.length !== 2) {
    throw new Error("Genau zwei positive Werte werden benötigt.");
  }

  let { distanceMeters, splitSecondsPer500, totalSeconds } = input;
  if (distanceMeters === undefined) distanceMeters = (totalSeconds! / splitSecondsPer500!) * 500;
  if (splitSecondsPer500 === undefined) splitSecondsPer500 = 500 * (totalSeconds! / distanceMeters);
  if (totalSeconds === undefined) totalSeconds = splitSecondsPer500 * (distanceMeters / 500);

  return {
    distanceMeters,
    splitSecondsPer500,
    totalSeconds,
    watts: 2.8 / Math.pow(splitSecondsPer500 / 500, 3),
  };
}

export function parseConcept2Time(value: string): number | undefined {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return undefined;
  const parts = normalized.split(":");
  if (parts.length > 2 || parts.some((part) => part === "")) return undefined;
  const numbers = parts.map(Number);
  if (numbers.some((part) => !Number.isFinite(part) || part < 0)) return undefined;
  if (parts.length === 1) return numbers[0] > 0 ? numbers[0] : undefined;
  const [minutes, seconds] = numbers;
  if (seconds >= 60) return undefined;
  const total = minutes * 60 + seconds;
  return total > 0 ? total : undefined;
}

export function formatConcept2Time(seconds: number): string {
  const rounded = Math.round(seconds * 10) / 10;
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded - minutes * 60;
  const whole = Math.floor(remainder);
  const tenths = Math.round((remainder - whole) * 10);
  return `${minutes}:${whole.toString().padStart(2, "0")}${tenths ? `.${tenths}` : ""}`;
}
