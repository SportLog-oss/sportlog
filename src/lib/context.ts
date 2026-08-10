import {
  getActivities,
  getActivityNotes,
  getAnalyticsSummary,
  getAnomalies,
  getBenchmarks,
  getDailyMetrics,
  getIllnessLog,
  getInjuryRisk,
  getMentalHealthCheckins,
  getPerformanceEstimates,
  getStrengthSessions,
  getTrainingLogEntries,
  getTrainingTrends,
} from "@/lib/data/store";
import { getCompetitions, getGoals } from "@/lib/data/store";

/**
 * Builds a compact textual snapshot of the athlete's current state for use
 * as LLM context. Kept deliberately terse (not raw JSON dumps) so it fits
 * comfortably in a system prompt.
 */
export async function buildAthleteContext(): Promise<string> {
  // All independent reads — parallelize instead of awaiting one at a time. This runs before
  // every coach turn, so serial round-trips here directly add to response latency.
  const [
    daily,
    analytics,
    trends,
    injuryRisk,
    anomalies,
    activities,
    perf,
    goals,
    competitions,
    illnessLog,
    mentalHealthCheckins,
    strengthSessions,
    benchmarks,
    trainingLogEntries,
    activityNotes,
  ] = await Promise.all([
    getDailyMetrics(),
    getAnalyticsSummary(),
    getTrainingTrends(),
    getInjuryRisk(),
    getAnomalies(),
    getActivities(),
    getPerformanceEstimates(),
    getGoals(),
    getCompetitions(),
    getIllnessLog(),
    getMentalHealthCheckins(),
    getStrengthSessions(),
    getBenchmarks(),
    getTrainingLogEntries(),
    getActivityNotes(),
  ]);

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

  lines.push("== Notizen & Ergo-Foto-Analysen zu Einheiten (letzte 5) ==");
  if (activityNotes.length === 0) {
    lines.push("Keine Notizen erfasst.");
  } else {
    const activityNameById = new Map(activities.activities.map((a) => [a.activityId, a.activityName]));
    const recentNotes = [...activityNotes].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)).slice(-5);
    for (const n of recentNotes) {
      const name = activityNameById.get(n.activityId) ?? `Aktivität ${n.activityId}`;
      lines.push(`${name}: ${n.note}`);
    }
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
  lines.push("");

  lines.push("== Krankheiten/Verletzungen ==");
  const activeIllness = illnessLog.filter((i) => !i.endDate);
  const recentIllness = illnessLog.filter((i) => i.endDate).slice(-3);
  if (activeIllness.length === 0 && recentIllness.length === 0) {
    lines.push("Keine Krankheiten/Verletzungen erfasst.");
  } else {
    for (const i of activeIllness) {
      lines.push(
        `AKTIV seit ${i.startDate}: ${i.symptoms.join(", ") || "keine Symptome angegeben"}. Trainingspause: ${i.trainingPausedFrom ?? "–"} bis ${i.trainingPausedUntil ?? "offen"}. Notizen: ${i.notes || "–"}.`
      );
    }
    for (const i of recentIllness) {
      lines.push(`Abgeschlossen ${i.startDate} bis ${i.endDate}: ${i.symptoms.join(", ") || "–"}, Rückkehr ins Training: ${i.returnedToTrainingOn ?? "unbekannt"}.`);
    }
  }
  lines.push("");

  lines.push("== Trainingsprotokoll (Schmerzen/Muskelkater/RPE, letzte 5 Einträge) ==");
  if (trainingLogEntries.length === 0) {
    lines.push("Noch keine Einträge.");
  } else {
    for (const t of trainingLogEntries.slice(-5)) {
      const painStr = t.pain.length > 0 ? t.pain.map((p) => `${p.bodyPart} ${p.intensity}/10`).join(", ") : "keine Schmerzen";
      lines.push(
        `${t.date}: Schmerzen: ${painStr}${t.injury ? " (Verletzung markiert!)" : ""}, Muskelkater ${t.soreness ?? "–"}/10, RPE ${t.rpe ?? "–"}/10. ${t.notes || ""}`.trim()
      );
    }
  }
  lines.push("");

  lines.push("== Mentale Gesundheit (letzte 5 Check-ins) ==");
  if (mentalHealthCheckins.length === 0) {
    lines.push("Noch keine Check-ins erfasst.");
  } else {
    for (const m of mentalHealthCheckins.slice(-5)) {
      lines.push(
        `${m.timestamp.slice(0, 10)} (${m.type}): Valenz ${m.valence.toFixed(2)} (-1 sehr unangenehm .. 1 sehr angenehm), ${m.emotionTags.join(", ") || "keine Tags"}.`
      );
    }
  }
  lines.push("");

  lines.push("== Krafttraining (letzte 5 Einheiten) ==");
  if (strengthSessions.length === 0) {
    lines.push("Noch keine Krafttrainings-Einheiten erfasst.");
  } else {
    for (const s of strengthSessions.slice(-5)) {
      const exStr = s.exercises.map((e) => `${e.name} (${e.sets.length} Sätze)`).join(", ");
      lines.push(`${s.date} ${s.title}: ${exStr || "keine Übungen erfasst"}.`);
    }
  }
  lines.push("");

  lines.push("== Benchmarks/Bestwerte ==");
  if (benchmarks.length === 0) {
    lines.push("Keine Benchmarks erfasst.");
  } else {
    for (const b of benchmarks) {
      const best = b.entries.length > 0
        ? (b.lowerIsBetter ? Math.min(...b.entries.map((e) => e.value)) : Math.max(...b.entries.map((e) => e.value)))
        : null;
      lines.push(`${b.name}: Bestwert ${best ?? "–"} ${b.unit}.`);
    }
  }

  return lines.join("\n");
}

export const COACH_SYSTEM_PROMPT = `Du bist der persönliche KI-Coach von SportLog für einen Leistungssportler: eine Kombination aus Trainer, Sportwissenschaftler und Gesundheitsanalyst, integriert in dessen Trainings- und Gesundheits-App.

Du hast Zugriff auf einen aktuellen Datenschnappschuss des Athleten: Trainingsdaten, HFV, Ruhepuls, Schlaf, Belastung (CTL/ATL/TSB, ACWR), Verletzungsrisiko, Ziele, Wettkämpfe, Krafttraining, Benchmarks/Bestwerte, Notizen und Ergo-Foto-Analysen zu einzelnen Einheiten, ein Trainingsprotokoll (Schmerzen/Muskelkater/RPE pro Einheit), ein Krankheits-/Verletzungsprotokoll und Check-ins zur mentalen Gesundheit. Nutze diese Daten, um konkrete, verständliche und wissenschaftlich fundierte Antworten zu geben.

Wichtig – der Nutzer betreibt Leistungssport:
- Empfiehl NIEMALS pauschal "weniger trainieren" oder einen Trainingsabbruch. Bewerte Belastung, Regeneration, Wettkampfphasen, Trainingslager und Krankheiten differenziert und schlage konkrete, angepasste Maßnahmen vor (z.B. Intensität statt Umfang reduzieren, gezielte Regenerationstage, Belastungssteuerung um einen Wettkampf herum).
- Berücksichtige aktive Krankheiten/Verletzungen aus dem Protokoll explizit, bevor du Trainingsempfehlungen gibst.
- Wenn HFV/Ruhepuls-Anomalien vorliegen UND eine Krankheit bereits im Protokoll erfasst ist, wiederhole nicht die generische "könnte auf eine beginnende Krankheit hindeuten"-Warnung, sondern beziehe dich auf die bekannte Krankheit.

Regeln:
- Antworte auf Deutsch, klar und konkret, ohne unnötigen Fachjargon (wenn du Fachbegriffe nutzt, erkläre sie kurz).
- Erkläre nicht nur WAS in den Daten passiert, sondern auch WARUM und was es für das Training bedeutet.
- Stelle NIEMALS medizinische Diagnosen. Formuliere gesundheitliche Beobachtungen immer als Wahrscheinlichkeiten/Hinweise ("könnte darauf hindeuten", "spricht für") und empfiehl bei ernsthaften oder anhaltenden Beschwerden einen Arztbesuch.
- Sei ehrlich über Unsicherheiten in den Daten (z.B. fehlende Werte, kurze Zeiträume).
- Gib, wo sinnvoll, eine konkrete Handlungsempfehlung für heute/die nächsten Tage.
- Halte Antworten fokussiert – lieber präzise als ausufernd.
- Formatierung: schreibe in normalem Fließtext mit kurzen Absätzen und ggf. einfachen Aufzählungspunkten (-). Verwende KEINE Markdown-Formatierung jeglicher Art: keine Sternchen für Fett/Kursiv (**text** oder *text*), keine Tabellen (keine |-Zeichen), keine Überschriften mit #, keine Backticks. Die Chat-Oberfläche stellt ausschließlich Klartext dar – jedes Sonderzeichen zur Formatierung erscheint dem Nutzer wörtlich auf dem Bildschirm.`;
