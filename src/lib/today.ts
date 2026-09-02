import { getActivities, getAnomalies, getAthleteDataSyncStatus, getDailyMetrics, getIllnessLog, getInjuryRisk, getNextRelevantCalendarEvent } from "@/lib/data/store";
import { computeSleepPerformance, computeStrain, generateWarnings, type Warning } from "@/lib/insights";
import type { Activity, CalendarEvent, DailyMetricRow } from "@/lib/types";
import { getPlanningWeek } from "@/lib/data/planningStore";
import { mondayForDate, type PlannedSession } from "@/lib/planning";
import { getPlanningMatches } from "@/lib/data/planningMatchStore";
import { adaptationFor } from "@/lib/trainingAdaptation";

export const SPORTLOG_TIME_ZONE = "Europe/Berlin";

/** Shared traffic-light logic for the three Heute state tiles (Erholung/Schlaf/Belastung) — same
 * color always means the same thing, independent of which metric it's attached to (Konzept 004). */
export type ZustandStatus = "good" | "watch" | "risk";

export const ZUSTAND_STATUS_COLOR: Record<ZustandStatus, string> = {
  good: "var(--positive)",
  watch: "var(--warning)",
  risk: "var(--negative)",
};

export function recoveryZustandStatus(pct: number | null): ZustandStatus {
  if (pct === null) return "watch";
  if (pct < 40) return "risk";
  if (pct < 70) return "watch";
  return "good";
}

export function sleepZustandStatus(pct: number | null): ZustandStatus {
  if (pct === null) return "watch";
  if (pct < 70) return "risk";
  if (pct < 85) return "watch";
  return "good";
}

export function loadZustandStatus(load: number): ZustandStatus {
  if (load >= 8) return "risk";
  if (load >= 4) return "watch";
  return "good";
}

/** Same lookup buildTodayResponse uses for the Erholung tile — kept as one shared source so the
 * Plan-Konflikt-Hinweis reads the identical recovery value instead of recomputing it. */
export function deriveRecoveryPct(rows: DailyMetricRow[]): number | null {
  const lastWithRecovery = [...rows].reverse().find((row) => row.recoveryScore !== null);
  return lastWithRecovery?.recoveryScore ?? null;
}

export async function getCurrentRecoveryPct(): Promise<number | null> {
  const daily = await getDailyMetrics();
  return deriveRecoveryPct(daily.rows);
}

export type CoachHint = { tone: "risk" | "good"; text: string };

/** Coach-Konflikt-Hinweis (Konzept 003 "Plan"): nur für heutige Einheiten, weil Erholung nur für
 * heute als echter Messwert vorliegt — für künftige Tage gäbe es keinen belastbaren Wert zum
 * Vergleichen. Bei "watch" bzw. fehlendem Wert bleibt es bewusst still, um nicht zu überladen.
 * Computed server-side (not exported for client import) because ZustandStatus thresholds live here
 * alongside the rest of the Erholungs-Ampel-Logik. */
export function todayCoachHint(recoveryPct: number | null): CoachHint | null {
  if (recoveryPct === null) return null;
  const status = recoveryZustandStatus(recoveryPct);
  if (status === "risk") return { tone: "risk", text: `Erholung heute niedrig (${Math.round(recoveryPct)} %) — prüfe, ob die Einheit angepasst werden sollte.` };
  if (status === "good") return { tone: "good", text: "Passt gut zu deinem aktuellen Zustand." };
  return null;
}

export type TodayReason = { label: string; detail: string; tone: "positive" | "neutral" | "warning" | "critical" };
export type TodayTrainingComparison = {
  plannedSessionId: string;
  plannedTitle: string;
  plannedSportType: string;
  plannedMinutes: number | null;
  activityId: number | null;
  activityTitle: string | null;
  actualMinutes: number | null;
  deviationMinutes: number | null;
  rpe: number | null;
  feeling: string | null;
  status: "planned" | "matched";
};
export type TodayResponse = {
  date: string;
  fetchedAt: string;
  phase: "before_training" | "after_training";
  displayMode: "morning" | "post_training" | "evening";
  dataQuality: { status: "current" | "limited"; label: string; ageHours: number | null };
  /** The five Tagesentscheidung states from Konzept 001. "focus" and "adjust" used to share the
   * "clarify" bucket — kept distinct now so the coach sentence and tile color don't conflate
   * "mit Fokus durchführen" (yellow, still training) with "mit Trainer klären" (red, stop and ask). */
  decision: { status: "insufficient_data" | "focus" | "adjust" | "clarify" | "planned"; title: string; summary: string };
  reasons: TodayReason[];
  focus: string;
  actions: { id: string; label: string; href?: string; disabled?: boolean }[];
  stats: { recoveryPct: number | null; strain: number; sleepPerformance: number | null };
  warnings: Warning[];
  todayActivities: Activity[];
  plannedSessions: PlannedSession[];
  nextPlannedSession: PlannedSession | null;
  /** At most the next relevant calendar event or conflict — read-only context, never a plan. */
  nextCalendarEvent: CalendarEvent | null;
  comparisons: TodayTrainingComparison[];
  journey: {
    stage: "plan" | "train" | "match" | "reflect" | "adapt" | "complete";
    title: string;
    detail: string;
    actionLabel: string;
    href: string;
    currentStep: number;
  };
};

export function localDateKey(date: Date, timeZone = SPORTLOG_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function greetingForDate(date = new Date(), timeZone = SPORTLOG_TIME_ZONE): string {
  const hour = localHour(date, timeZone);
  if (hour < 5) return "Gute Nacht";
  if (hour < 11) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  if (hour < 23) return "Guten Abend";
  return "Gute Nacht";
}

export function localHour(date = new Date(), timeZone = SPORTLOG_TIME_ZONE): number {
  const part = new Intl.DateTimeFormat("de-DE", { timeZone, hour: "2-digit", hourCycle: "h23" }).formatToParts(date).find((item) => item.type === "hour");
  const hour = Number(part?.value ?? 0);
  return Number.isFinite(hour) ? hour % 24 : 0;
}

export async function buildTodayResponse(): Promise<TodayResponse> {
  const now = new Date();
  const today = localDateKey(now);
  const weekStart = mondayForDate(today);
  const [daily, injuryRisk, anomalies, activityCache, illnesses, syncStatus, planningWeek, planningMatches, nextCalendarEvent] = await Promise.all([
    getDailyMetrics(), getInjuryRisk(), getAnomalies(), getActivities(), getIllnessLog(), getAthleteDataSyncStatus(), getPlanningWeek(mondayForDate(today)),
    getPlanningMatches(weekStart),
    // Calendar context is additive and its table may not exist yet (Kalenderkontext V1 is an
    // unapplied local migration draft) — never let a missing table break the Heute page.
    getNextRelevantCalendarEvent().catch(() => null),
  ]);
  const rows = daily.rows;
  const lastWithLoad = [...rows].reverse().find((row) => row.dailyLoad !== null);
  const lastWithSleep = [...rows].reverse().find((row) => row.sleepDurationMin !== null && row.sleepNeedMin !== null);
  const recoveryPct = deriveRecoveryPct(rows);
  const sleepPerformance = computeSleepPerformance(lastWithSleep?.sleepDurationMin, lastWithSleep?.sleepNeedMin);
  const activeIllness = illnesses.find((entry) => entry.startDate <= today && (entry.endDate === null || entry.endDate >= today));
  const fetchedAtMs = new Date(daily.fetchedAt).getTime();
  const ageHours = Number.isFinite(fetchedAtMs) ? Math.max(0, (now.getTime() - fetchedAtMs) / 3_600_000) : null;
  const stale = ageHours === null || ageHours > 36 || syncStatus.status === "failed";
  const reasons: TodayReason[] = [];
  if (activeIllness) reasons.push({ label: "Gesundheit", detail: "Aktive Krankheit dokumentiert", tone: "critical" });
  if (recoveryPct !== null) reasons.push({ label: "Erholung", detail: recoveryPct >= 70 ? `Erholung im Zielband (${Math.round(recoveryPct)} %)` : recoveryPct >= 40 ? `Erholung ${Math.round(recoveryPct)} % – aufmerksam beobachten` : `Erholung niedrig (${Math.round(recoveryPct)} %)`, tone: recoveryPct < 25 ? "warning" : recoveryPct >= 60 ? "positive" : "neutral" });
  if (sleepPerformance !== null) reasons.push({ label: "Schlaf", detail: sleepPerformance >= 85 ? `Schlaf über Bedarf (${Math.round(sleepPerformance)} %)` : `Schlaf ${Math.round(sleepPerformance)} % des Bedarfs`, tone: sleepPerformance < 70 ? "warning" : "neutral" });
  if (stale) reasons.unshift({ label: "Datenqualität", detail: "Datenlage eingeschränkt", tone: "warning" });
  const todayActivities = activityCache.activities.filter((activity) => localDateKey(new Date(activity.startTimeInSeconds * 1000)) === today);
  const plannedSessions = planningWeek.sessions.filter((session) => session.scheduledDate === today && session.status !== "cancelled");
  const nextPlannedSession = planningWeek.sessions
    .filter((session) => session.scheduledDate > today && session.status !== "cancelled")
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0] ?? null;
  const hour = localHour(now);
  const displayMode: TodayResponse["displayMode"] = hour >= 18 ? "evening" : todayActivities.length > 0 ? "post_training" : "morning";
  const primaryPlan = plannedSessions[0];
  const todaySessionIds = new Set(plannedSessions.map((session) => session.id));
  const todayMatches = planningMatches.filter((match) => todaySessionIds.has(match.plannedSessionId));
  const confirmedMatches = todayMatches.filter((match) => match.status === "confirmed");
  const suggestedMatch = todayMatches.find((match) => match.status === "suggested");
  const feelingLabels = { great: "Sehr gut", good: "Gut", okay: "Okay", hard: "Schwer", bad: "Schlecht" } as const;
  const comparisons: TodayTrainingComparison[] = plannedSessions.map((plan) => {
    const match = confirmedMatches.find((item) => item.plannedSessionId === plan.id);
    const activity = match?.workout.externalId ? todayActivities.find((item) => String(item.activityId) === match.workout.externalId) : null;
    const actualMinutes = activity ? Math.round(activity.durationInSeconds / 60) : match?.workout.durationSeconds ? Math.round(match.workout.durationSeconds / 60) : null;
    const activityId = match?.workout.externalId ? Number(match.workout.externalId) : null;
    return {
      plannedSessionId: plan.id,
      plannedTitle: plan.title,
      plannedSportType: plan.sportType,
      plannedMinutes: plan.plannedDurationMin,
      activityId: activityId !== null && Number.isFinite(activityId) ? activityId : null,
      activityTitle: match?.workout.title ?? null,
      actualMinutes,
      deviationMinutes: actualMinutes === null ? null : actualMinutes - (plan.plannedDurationMin ?? actualMinutes),
      rpe: match?.reflection?.perceivedExertion ?? match?.workout.importedRpe ?? null,
      feeling: match?.reflection?.feeling ? feelingLabels[match.reflection.feeling] : null,
      status: match && actualMinutes !== null ? "matched" : "planned",
    };
  });
  const allPlannedSessionsMatched = plannedSessions.length > 0 && comparisons.every((item) => item.status === "matched");
  const unreflectedMatch = confirmedMatches.find((match) => !match.reflection);
  const adaptation = confirmedMatches.map(adaptationFor).find(Boolean) ?? null;
  const journey: TodayResponse["journey"] = !primaryPlan
    ? { stage: "plan", title: "Training für heute planen", detail: "Lege zuerst fest, was die heutige Einheit bewirken soll.", actionLabel: "Einheit planen", href: "/planung", currentStep: 0 }
    : todayActivities.length === 0
      ? { stage: "train", title: primaryPlan.title, detail: primaryPlan.plannedDurationMin ? `${primaryPlan.plannedDurationMin} Minuten sind geplant. Danach übernimmt SportLog deine Garmin-Daten.` : "Die Einheit ist geplant. Danach übernimmt SportLog deine Garmin-Daten.", actionLabel: "Heutigen Plan ansehen", href: "/planung", currentStep: 1 }
      : !allPlannedSessionsMatched
        ? { stage: "match", title: suggestedMatch ? "Aktivität dem Plan zuordnen" : "Plan und Aktivität abgleichen", detail: suggestedMatch ? "SportLog hat eine passende Garmin-Aktivität gefunden. Bitte bestätige die Zuordnung." : "Die heutige Aktivität wurde erkannt, aber noch keiner Plan-Einheit sicher zugeordnet.", actionLabel: "Zuordnung prüfen", href: "/planung", currentStep: 2 }
        : unreflectedMatch
          ? { stage: "reflect", title: "Nachbereitung ergänzen", detail: "Garmin-Bewertung ist verfügbar. Ergänze nur Beschwerden, Muskelkater oder eine kurze Notiz.", actionLabel: "Training reflektieren", href: "/planung", currentStep: 3 }
          : adaptation
            ? { stage: "adapt", title: adaptation.title, detail: `${adaptation.reason} Prüfe den Vorschlag für die nächste Einheit.`, actionLabel: "Anpassung prüfen", href: "/planung", currentStep: 4 }
            : { stage: "complete", title: "Erholung beobachten", detail: "Plan, Garmin-Aktivität und Reflexion sind verbunden. Aktuell ist keine Plananpassung nötig.", actionLabel: "Ergebnis ansehen", href: "/planung", currentStep: 5 };
  const cautionNotes: string[] = [];
  if (recoveryPct !== null && recoveryPct < 70) cautionNotes.push(`deine Erholung liegt bei ${Math.round(recoveryPct)} %`);
  if (sleepPerformance !== null && sleepPerformance < 85) cautionNotes.push(`dein Schlaf lag unter deinem Bedarf`);
  const planLabel = plannedSessions.length > 1 ? `${plannedSessions.length} Einheiten` : primaryPlan ? `„${primaryPlan.title}“` : "";

  const decision = activeIllness
    ? { status: "clarify" as const, title: "Vor dem Training mit Trainer oder Arzt klären", summary: primaryPlan ? `Für heute ist ${planLabel} geplant. Wegen der aktiven Krankheit sollte die Durchführung trotzdem geklärt werden.` : "Wegen der aktiven Krankheit sollte intensive Belastung nicht allein aus Messwerten abgeleitet werden." }
    : journey.stage === "complete"
      ? { status: "planned" as const, title: "Training abgeschlossen und eingeordnet", summary: "Dein Training ist sauber mit dem Plan verbunden. Für heute bist du fertig." }
      : journey.stage === "adapt"
        ? { status: "adjust" as const, title: adaptation ? adaptation.title : "Nächste Einheit bewusst anpassen", summary: journey.detail }
        : stale
          ? { status: "insufficient_data" as const, title: primaryPlan ? "Plan vorhanden, aber noch keine belastbare Empfehlung" : "Noch keine belastbare Entscheidung", summary: primaryPlan ? `${planLabel} ${plannedSessions.length > 1 ? "sind" : "ist"} geplant, aber die aktuellen Schlaf- und Erholungsdaten fehlen oder sind veraltet.` : "Die aktuellen Schlaf- und Erholungsdaten fehlen oder sind veraltet." }
          : primaryPlan
            ? cautionNotes.length > 0
              ? { status: "focus" as const, title: `Mit Fokus durchführen: ${planLabel}`, summary: `Die Einheit bleibt sinnvoll, ${cautionNotes[0]} – heute mit Aufmerksamkeit statt auf Umfang gehen.` }
              : { status: "planned" as const, title: `Plan wie vorgesehen: ${planLabel}`, summary: "Dein aktueller Zustand spricht nicht gegen die geplante Belastung. Setze die Einheit wie vorgesehen um." }
            : { status: "insufficient_data" as const, title: "Noch keine belastbare Entscheidung", summary: "Dein aktueller Zustand ist eingeordnet, aber SportLog kennt noch keine geplante Einheit für heute." };
  return {
    date: today, fetchedAt: daily.fetchedAt, phase: todayActivities.length > 0 ? "after_training" : "before_training", displayMode,
    dataQuality: { status: stale ? "limited" : "current", label: stale ? "Datenlage eingeschränkt" : "Daten aktuell", ageHours: ageHours === null ? null : Math.round(ageHours) },
    decision, reasons: reasons.slice(0, 2),
    focus: activeIllness ? "Gesundheit zuerst: Symptome und Trainingspause prüfen." : journey.stage === "complete" ? "Erholung beobachten und die nächste geplante Einheit erst bei neuen Signalen anpassen." : journey.stage === "adapt" ? journey.detail : todayActivities.length > 0 ? "Training kurz reflektieren und relevante Abweichungen festhalten." : primaryPlan ? primaryPlan.technicalFocus || primaryPlan.description || `Die geplante Einheit „${primaryPlan.title}“ bewusst durchführen.` : "Geplante Einheit ergänzen, damit SportLog Plan und Zustand verbinden kann.",
    actions: [
      ...(todayActivities.length > 0 ? [{ id: "review", label: "Heutige Aktivität öffnen", href: `/training/${todayActivities[0].activityId}` }] : []),
      { id: "plan", label: primaryPlan ? "Heutigen Plan öffnen" : "Einheit für heute planen", href: "/planung" },
      ...(activeIllness ? [{ id: "health", label: "Krankheitsstatus prüfen", href: "/health" }] : []),
    ].slice(0, 3),
    stats: { recoveryPct, strain: computeStrain(lastWithLoad?.dailyLoad ?? null), sleepPerformance },
    warnings: generateWarnings(rows, anomalies.anomalies, injuryRisk).slice(0, 3), todayActivities, plannedSessions, nextPlannedSession, nextCalendarEvent, comparisons, journey,
  };
}
