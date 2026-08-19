import type { CompetitionResult } from "./types";

/**
 * Parst eine offizielle Rennzeit aus der freien Texteingabe (`m:ss`, `h:mm:ss`
 * oder reine Sekunden, Komma oder Punkt als Dezimaltrenner) in Sekunden.
 * Reine Fachlogik aus CompetitionsSection ausgelagert.
 */
export function parseOfficialTime(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parts = normalized.split(":").map(Number);
  if (parts.some(Number.isNaN) || parts.length > 3) return null;
  if (parts.length === 1) return parts[0] > 0 ? parts[0] : null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

/** Formatiert Sekunden als deutsche Rennzeit (`m:ss,zz`). */
export function formatOfficialTime(seconds: number | null): string {
  if (seconds === null) return "–";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds - minutes * 60;
  return `${minutes}:${remainder.toFixed(2).padStart(5, "0").replace(".", ",")}`;
}

/**
 * Parst Zwischenzeiten aus einer Zeile-für-Zeile-Eingabe wie `500m: 1:38,4`.
 * Der erste Doppelpunkt trennt Streckenpunkt und Zeit; weitere Doppelpunkte
 * innerhalb der Zeit (`1:38,4`) bleiben dadurch erhalten.
 */
export function parseSplits(raw: string): { split: string; time: string }[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(":");
      if (separator === -1) return { split: line, time: "" };
      return { split: line.slice(0, separator).trim(), time: line.slice(separator + 1).trim() };
    });
}

/** Formatiert eine Dauer in Sekunden als `h min` bzw. `m:ss min`. */
export function formatDuration(seconds: number | null): string {
  if (!seconds) return "–";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes}:${String(remainingSeconds).padStart(2, "0")} min`;
}

/** Formatiert eine Distanz in Metern, ab 1000 m als Kilometer. */
export function formatDistance(meters: number | null): string {
  if (!meters) return "–";
  return meters >= 1000 ? `${(meters / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 })} km` : `${Math.round(meters)} m`;
}

/** Baut den Bearbeitungsentwurf aus einem bestehenden Wettkampf. */
export function competitionToEditForm(c: CompetitionResult) {
  return {
    name: c.name,
    date: c.date,
    location: c.location,
    boatClass: c.boatClass,
    crew: c.crew,
    goal: c.goal,
    distanceMeters: String(c.distanceMeters ?? 2000),
    result: c.result,
    placement: c.placement !== null ? String(c.placement) : "",
    avgHeartRate: c.avgHeartRate !== null ? String(c.avgHeartRate) : "",
    weather: c.weather,
    wind: c.wind,
    notes: c.notes,
    splitsRaw: c.splits.map((s) => `${s.split}: ${s.time}`).join("\n"),
  };
}
