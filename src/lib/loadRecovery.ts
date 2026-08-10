import type { DailyMetricRow } from "@/lib/types";

export type LoadRecoveryAssessment = {
  reliable: boolean;
  headline: string;
  statements: string[];
  fitnessTrend: "up" | "stable" | "down" | "unknown";
  formTone: "positive" | "neutral" | "warning";
};

export function assessLoadRecovery(rows: DailyMetricRow[], index: number): LoadRecoveryAssessment {
  const row = rows[index];
  const history = rows.slice(Math.max(0, index - 13), index + 1).filter((item) =>
    item.ctl !== null && item.atl !== null && item.tsb !== null
  );
  if (!row || row.ctl === null || row.atl === null || row.tsb === null || history.length < 7) {
    return {
      reliable: false,
      headline: "Noch nicht genügend Daten für eine zuverlässige Bewertung.",
      statements: [],
      fitnessTrend: "unknown",
      formTone: "neutral",
    };
  }

  const statements: string[] = [];
  const loadRatio = row.ctl > 0 ? row.atl / row.ctl : null;
  if (loadRatio !== null && loadRatio > 1.3) statements.push("Hohe kurzfristige Belastung im Verhältnis zur langfristigen Fitness.");
  else if (loadRatio !== null && loadRatio < 0.75) statements.push("Kurzfristige Belastung aktuell eher niedrig.");
  else statements.push("Belastung im normalen Bereich deiner aktuellen Fitness.");

  let formTone: LoadRecoveryAssessment["formTone"] = "neutral";
  if (row.tsb <= -20) {
    statements.push("Form aktuell deutlich reduziert; zusätzliche Erholung kann sinnvoll sein.");
    formTone = "warning";
  } else if (row.tsb < -8) {
    statements.push("Form aktuell leicht reduziert.");
    formTone = "warning";
  } else if (row.tsb > 15) {
    statements.push("Aktuelle Form zeigt viel Frische bei vergleichsweise geringer kurzfristiger Belastung.");
    formTone = "positive";
  } else {
    statements.push("Aktuelle Form liegt in einem ausgeglichenen Bereich.");
  }

  const comparison = history[Math.max(0, history.length - 8)];
  const ctlChange = comparison?.ctl !== null ? row.ctl - comparison.ctl : 0;
  const fitnessTrend = ctlChange > 1 ? "up" : ctlChange < -1 ? "down" : "stable";
  if (fitnessTrend === "up") statements.push("Langfristige Fitness steigt.");
  else if (fitnessTrend === "down") statements.push("Langfristige Fitness ist zuletzt leicht gesunken.");
  else statements.push("Langfristige Fitness ist aktuell stabil.");

  return {
    reliable: true,
    headline: row.dailyLoad !== null
      ? `Diese Einheit trägt zu einer Tagesbelastung von ${Math.round(row.dailyLoad)} bei.`
      : "Die Einheit ist in der aktuellen Belastungs- und Formkurve berücksichtigt.",
    statements,
    fitnessTrend,
    formTone,
  };
}
