export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export function formatDate(input: string | number): string {
  const date = typeof input === "number" ? new Date(input * 1000) : new Date(input);
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function localIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

const READINESS_VERDICT_LABELS: Record<string, string> = {
  rest: "Ruhe empfohlen",
  easy: "Locker",
  steady: "Gleichmäßig",
  go: "Bereit für Intensität",
};

export function readinessVerdictLabel(verdict: string | null | undefined): string {
  if (!verdict) return "";
  return READINESS_VERDICT_LABELS[verdict] ?? verdict;
}

const POWER_PROFILE_TERMS: Record<string, string> = {
  sprinter: "Sprinter",
  time_trialist: "Zeitfahrer",
  puncheur: "Angriffsfahrer",
  climber: "Kletterer",
  all_rounder: "Allrounder",
  pursuiter: "Verfolger",
  neuromuscular: "Neuromuskulär (Sprintkraft)",
  anaerobic_capacity: "Anaerobe Kapazität",
  aerobic_capacity: "Aerobe Kapazität",
  vo2max: "VO2max",
  threshold: "Schwelle",
  endurance: "Ausdauer",
  sprint: "Sprint",
};

export function translatePowerProfileTerm(value: string): string {
  const key = value.toLowerCase();
  if (POWER_PROFILE_TERMS[key]) return POWER_PROFILE_TERMS[key];
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Precise clock display ("12:34" / "1:02:34") for a raw seconds value — distinct from
// formatDuration's rounded "1h 27min" style, needed where exact PB times matter.
export function formatClockDuration(seconds: number): string {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
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

const ROWING_TYPES = ["ROWING_V2", "INDOOR_ROWING"];

export function formatActivityPace(activity: {
  activityType: string;
  distanceInMeters: number;
  durationInSeconds: number;
  averageSpeedInMetersPerSecond?: number;
  averagePaceInMinutesPerKilometer?: number;
}): string | null {
  if (activity.activityType === "CYCLING") {
    const speedMps =
      activity.averageSpeedInMetersPerSecond ??
      (activity.durationInSeconds > 0 ? activity.distanceInMeters / activity.durationInSeconds : undefined);
    if (!speedMps || !Number.isFinite(speedMps)) return null;
    return `${(speedMps * 3.6).toFixed(1)} km/h`;
  }

  if (ROWING_TYPES.includes(activity.activityType)) {
    if (!activity.distanceInMeters || activity.distanceInMeters <= 0 || !activity.durationInSeconds) return null;
    const secPer500 = activity.durationInSeconds / (activity.distanceInMeters / 500);
    if (!Number.isFinite(secPer500)) return null;
    const min = Math.floor(secPer500 / 60);
    const sec = Math.round(secPer500 % 60);
    return `${min}:${sec.toString().padStart(2, "0")} /500m`;
  }

  return formatPace(activity.averagePaceInMinutesPerKilometer);
}
