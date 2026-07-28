import {
  getActivities,
  getAnalyticsSummary,
  getAnomalies,
  getDailyMetrics,
  getInjuryRisk,
  getPerformanceEstimates,
  getTrainingTrends,
} from "@/lib/data/store";
import { getCompetitions, getGoals } from "@/lib/data/store";

/**
 * Builds a compact textual snapshot of the athlete's current state for use
 * as LLM context. Kept deliberately terse (not raw JSON dumps) so it fits
 * comfortably in a system prompt.
 */
export async function buildAthleteContext(): Promise<string> {
  const daily = await getDailyMetrics();
  const analytics = await getAnalyticsSummary();
  const trends = await getTrainingTrends();
  const injuryRisk = await getInjuryRisk();
  const anomalies = await getAnomalies();
  const activities = await getActivities();
  const perf = await getPerformanceEstimates();
  const goals = await getGoals();
  const competitions = await getCompetitions();

  const last = daily.rows[daily.rows.length - 1];
  const last7 = daily.rows.slice(-7);

  const lines: string[] = [];

  lines.push(`Stand der Daten: ${daily.fetchedAt} (Zeitraum ${daily.period})`);
  lines.push("");
  lines.push("== Aktueller Zustand ==");
  lines.push(
    `CTL (Fitness) ${last.ctl}, ATL (Ermüdung) ${last.atl}, TSB (Form) ${last.tsb}, Rampenrate ${last.rampRate} CTL/Woche.`
  );
  lines.push(`Trainingsbereitschaft/Recovery zuletzt bekannt: ${last7.find((r) => r.recoveryScore !== null)?.recoveryScore ?? "unbekannt"}.`);
  lines.push(`Verletzungs-/Überlastungsrisiko-Index: ${injuryRisk.index} (Treiber: ${injuryRisk.drivers.join(", ") || "keine"}).`);
  lines.push("");

  lines.push("== HFV & Ruhepuls (letzte 14 Tage) ==");
  lines.push(
    `HFV: 7-Tage-Ø ${trends.recovery.hrv_7day_avg}, 14-Tage-Ø ${trends.recovery.hrv_14day_avg}, Trend: ${trends.recovery.hrv_trend}.`
  );
  lines.push(
    `Ruhepuls: 7-Tage-Ø ${trends.recovery.rhr_7day_avg}, 14-Tage-Ø ${trends.recovery.rhr_14day_avg}, Trend: ${trends.recovery.rhr_trend}.`
  );
  lines.push("");

  lines.push("== Schlaf ==");
  lines.push(
    `Ø Dauer ${trends.sleep.avg_duration_hours} h, Ø Score ${trends.sleep.avg_score}, Nächte < 7h: ${trends.sleep.nights_below_7h}/${trends.sleep.nights_tracked}.`
  );
  lines.push("");

  lines.push("== Trainingsumfang (letzte 4 Wochen) ==");
  for (const w of analytics.weekly_volume) {
    lines.push(
      `${w.week}: ${w.hours}h, ${w.km}km, ${w.sessions} Einheiten, Load ${w.load}, Sportarten: ${Object.keys(w.by_sport).join(", ")}.`
    );
  }
  lines.push("");

  lines.push("== Anomalien (letzte 7 Tage) ==");
  if (anomalies.anomalies.length === 0) {
    lines.push("Keine auffälligen Anomalien.");
  } else {
    for (const a of anomalies.anomalies) {
      lines.push(`${a.date}: ${a.metric} ${a.direction === "up" ? "auffällig hoch" : "auffällig niedrig"} (z=${a.zScore}).`);
    }
  }
  lines.push("");

  lines.push("== Letzte Trainingseinheiten ==");
  for (const act of activities.activities.slice(0, 8)) {
    const dateStr = new Date(act.startTimeInSeconds * 1000).toISOString().slice(0, 10);
    const km = (act.distanceInMeters / 1000).toFixed(1);
    const min = Math.round(act.durationInSeconds / 60);
    lines.push(
      `${dateStr}: ${act.activityName} (${act.activityType}), ${min} min${act.distanceInMeters > 0 ? `, ${km} km` : ""}, Ø HF ${act.averageHeartRateInBeatsPerMinute ?? "–"}.`
    );
  }
  lines.push("");

  lines.push("== Leistungsprofil ==");
  lines.push(
    `FTP ${perf.ftp_watts} W, Archetyp: ${perf.power_profile.archetype}, Stärken: ${perf.power_profile.strengths.join(", ")}, Schwächen: ${perf.power_profile.limiters.join(", ")}.`
  );
  lines.push("");

  lines.push("== Ziele ==");
  if (goals.length === 0) {
    lines.push("Keine Ziele hinterlegt.");
  } else {
    for (const g of goals) {
      lines.push(
        `${g.title} (${g.category}), Ziel: ${g.targetValue ?? "–"} ${g.unit} bis ${g.targetDate}, aktueller Stand: ${g.currentValue ?? "unbekannt"}.`
      );
    }
  }
  lines.push("");

  lines.push("== Wettkämpfe ==");
  if (competitions.length === 0) {
    lines.push("Noch keine Wettkämpfe erfasst.");
  } else {
    for (const c of competitions) {
      lines.push(`${c.date} ${c.name} (${c.boatClass}): Ergebnis ${c.result}, Platz ${c.placement ?? "–"}.`);
    }
  }

  return lines.join("\n");
}

export const COACH_SYSTEM_PROMPT = `Du bist ein persönlicher KI-Coach für einen Rudersportler: eine Kombination aus Trainer, Sportwissenschaftler und Gesundheitsanalyst, integriert in dessen Trainings- und Gesundheits-App.

Du hast Zugriff auf einen aktuellen Datenschnappschuss des Athleten (Trainingsdaten, HFV, Ruhepuls, Schlaf, Belastung, Ziele, Wettkämpfe). Nutze diese Daten, um konkrete, verständliche und wissenschaftlich fundierte Antworten zu geben.

Regeln:
- Antworte auf Deutsch, klar und konkret, ohne unnötigen Fachjargon (wenn du Fachbegriffe nutzt, erkläre sie kurz).
- Erkläre nicht nur WAS in den Daten passiert, sondern auch WARUM und was es für das Training bedeutet.
- Stelle NIEMALS medizinische Diagnosen. Formuliere gesundheitliche Beobachtungen immer als Wahrscheinlichkeiten/Hinweise ("könnte darauf hindeuten", "spricht für") und empfiehl bei ernsthaften oder anhaltenden Beschwerden einen Arztbesuch.
- Sei ehrlich über Unsicherheiten in den Daten (z.B. fehlende Werte, kurze Zeiträume).
- Gib, wo sinnvoll, eine konkrete Handlungsempfehlung für heute/die nächsten Tage.
- Halte Antworten fokussiert – lieber präzise als ausufernd.
- Formatierung: schreibe in normalem Fließtext mit kurzen Absätzen und ggf. einfachen Aufzählungspunkten (-). Verwende KEINE Markdown-Formatierung jeglicher Art: keine Sternchen für Fett/Kursiv (**text** oder *text*), keine Tabellen (keine |-Zeichen), keine Überschriften mit #, keine Backticks. Die Chat-Oberfläche stellt ausschließlich Klartext dar – jedes Sonderzeichen zur Formatierung erscheint dem Nutzer wörtlich auf dem Bildschirm.`;
