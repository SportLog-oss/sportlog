import type { IllnessLogEntry } from "./types";
import type { PlannedSession } from "./planning";

export type IllnessSessionLink = { session: PlannedSession; auto: boolean };

/** Konzept 005, Ergänzung 3: automatische Verknüpfung nach Datumsnähe, wo eindeutig möglich —
 * analog zur bestehenden Garmin-Aktivitäts-Zuordnung — sonst manuelle Auswahl/Korrektur. A manual
 * choice (linkedSessionId) always wins; an explicit dismissal suppresses the auto-suggestion so it
 * doesn't keep reappearing. Otherwise: exactly one non-cancelled session scheduled within
 * [startDate, endDate ?? today] counts as unambiguous; zero or several candidates stay unresolved. */
export function resolveIllnessSessionLink(entry: IllnessLogEntry, sessions: PlannedSession[]): IllnessSessionLink | null {
  if (entry.linkedSessionId) {
    const manual = sessions.find((session) => session.id === entry.linkedSessionId);
    return manual ? { session: manual, auto: false } : null;
  }
  if (entry.linkedSessionDismissed) return null;

  const rangeEnd = entry.endDate ?? new Date().toISOString().slice(0, 10);
  const candidates = sessions.filter(
    (session) => session.status !== "cancelled" && session.scheduledDate >= entry.startDate && session.scheduledDate <= rangeEnd
  );
  return candidates.length === 1 ? { session: candidates[0], auto: true } : null;
}

const STATUS_SUFFIX: Partial<Record<PlannedSession["status"], string>> = {
  cancelled: " (ausgefallen)",
  changed: " (geändert)",
  moved: " (verschoben)",
};

export function illnessSessionLinkLabel(session: PlannedSession): string {
  const dateLabel = new Date(`${session.scheduledDate}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });
  return `${session.title} · ${session.sportType} · ${dateLabel}${STATUS_SUFFIX[session.status] ?? ""}`;
}
