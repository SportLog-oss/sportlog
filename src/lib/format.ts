export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export function formatDate(input: string | number): string {
  const date = typeof input === "number" ? new Date(input * 1000) : new Date(input);
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDistance(meters: number): string {
  if (meters <= 0) return "–";
  return `${(meters / 1000).toFixed(1)} km`;
}

const ACTIVITY_LABELS: Record<string, string> = {
  ROWING_V2: "Rudern",
  INDOOR_ROWING: "Indoor-Rudern",
  STRENGTH_TRAINING: "Krafttraining",
  CYCLING: "Radfahren",
  RUNNING: "Laufen",
  WALKING: "Gehen",
};

export function activityLabel(type: string): string {
  return ACTIVITY_LABELS[type] ?? type;
}

export function formatDurationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const min = seconds / 60;
  return Number.isInteger(min) ? `${min}min` : `${min.toFixed(1)}min`;
}

export function formatPace(minPerKm: number | undefined): string | null {
  if (!minPerKm || !Number.isFinite(minPerKm)) return null;
  const min = Math.floor(minPerKm);
  const sec = Math.round((minPerKm - min) * 60);
  return `${min}:${sec.toString().padStart(2, "0")} /km`;
}
