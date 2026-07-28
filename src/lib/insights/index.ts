import type { AnomalyEntry, DailyMetricRow, InjuryRiskCache } from "@/lib/types";

export type Sentiment = "positive" | "neutral" | "negative";

export interface Explanation {
  headline: string;
  body: string;
  sentiment: Sentiment;
  recommendation: string;
}

function withValues(rows: DailyMetricRow[], key: keyof DailyMetricRow): { date: string; value: number }[] {
  return rows
    .filter((r) => typeof r[key] === "number")
    .map((r) => ({ date: r.date, value: r[key] as number }));
}

function average(values: number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function splitHalves(values: number[]): { first: number[]; second: number[] } {
  const mid = Math.floor(values.length / 2);
  return { first: values.slice(0, mid), second: values.slice(mid) };
}

const STRAIN_SCALE_K = 80;

export function computeStrain(dailyLoad: number | null | undefined): number {
  if (!dailyLoad || dailyLoad <= 0) return 0;
  return 21 * (1 - Math.exp(-dailyLoad / STRAIN_SCALE_K));
}

export function strainLabel(strain: number): string {
  if (strain < 10) return "Leicht";
  if (strain < 14) return "Moderat";
  if (strain < 18) return "Hoch";
  return "Sehr hoch";
}

export function computeSleepPerformance(
  sleepDurationMin: number | null | undefined,
  sleepNeedMin: number | null | undefined
): number | null {
  if (!sleepDurationMin || !sleepNeedMin) return null;
  return (sleepDurationMin / sleepNeedMin) * 100;
}

export function recoveryLabel(pct: number): string {
  if (pct < 34) return "Niedrig";
  if (pct < 67) return "Mittel";
  return "Hoch";
}

export function sleepPerformanceLabel(pct: number): string {
  if (pct < 70) return "Unzureichend";
  if (pct < 90) return "Ausreichend";
  return "Optimal";
}

export function explainHrv(rows: DailyMetricRow[]): Explanation {
  const series = withValues(rows, "hrv");
  const values = series.map((s) => s.value);
  const { first, second } = splitHalves(values);
  const avgFirst = average(first);
  const avgSecond = average(second);
  const deltaPct = ((avgSecond - avgFirst) / avgFirst) * 100;
  const latest = values[values.length - 1];
  const baseline = rows[rows.length - 1]?.hrvBaseline60d ?? avgFirst;

  let sentiment: Sentiment = "neutral";
  if (deltaPct <= -8) sentiment = "negative";
  else if (deltaPct >= 8) sentiment = "positive";

  const headline =
    deltaPct <= -8
      ? `Deine HFV ist in den letzten Tagen um ${Math.abs(deltaPct).toFixed(0)}% gesunken`
      : deltaPct >= 8
        ? `Deine HFV ist um ${deltaPct.toFixed(0)}% gestiegen`
        : "Deine HFV bewegt sich im gewohnten Bereich";

  const body = `Aktueller Wert: ${latest?.toFixed(0) ?? "–"} ms (60-Tage-Basislinie: ${baseline?.toFixed(0) ?? "–"} ms). Die HFV spiegelt wider, wie gut dein autonomes Nervensystem aktuell mit der Trainings- und Alltagsbelastung zurechtkommt. Ein Rückgang über mehrere Tage deutet meist auf unzureichende Erholung, Stress oder eine beginnende Belastungsspitze hin – ein Anstieg auf gute Anpassung und Erholung.`;

  const recommendation =
    sentiment === "negative"
      ? "Plane die nächsten 1-2 Einheiten locker (Zone 1-2) und priorisiere Schlaf, bevor du wieder intensiv trainierst."
      : sentiment === "positive"
        ? "Dein Körper verträgt aktuell mehr Reiz – ein intensiveres Training oder ein Test ist gut vertretbar."
        : "Kein Handlungsbedarf – trainiere wie geplant und beobachte die nächsten Tage weiter.";

  return { headline, body, sentiment, recommendation };
}

export function explainRhr(rows: DailyMetricRow[]): Explanation {
  const series = withValues(rows, "restingHr");
  const values = series.map((s) => s.value);
  const { first, second } = splitHalves(values);
  const avgFirst = average(first);
  const avgSecond = average(second);
  const delta = avgSecond - avgFirst;
  const latest = values[values.length - 1];

  let sentiment: Sentiment = "neutral";
  if (delta >= 3) sentiment = "negative";
  else if (delta <= -3) sentiment = "positive";

  const headline =
    delta >= 3
      ? `Dein Ruhepuls ist um ${delta.toFixed(1)} bpm gestiegen`
      : delta <= -3
        ? `Dein Ruhepuls ist um ${Math.abs(delta).toFixed(1)} bpm gesunken`
        : "Dein Ruhepuls ist stabil";

  const body = `Aktueller Wert: ${latest?.toFixed(0) ?? "–"} bpm (Durchschnitt Vorperiode: ${avgFirst.toFixed(0)} bpm). Ein erhöhter Ruhepuls über mehrere Tage in Kombination mit sinkender HFV ist eines der zuverlässigsten Frühwarnzeichen für unzureichende Regeneration, Übertraining oder eine beginnende Erkrankung.`;

  const recommendation =
    sentiment === "negative"
      ? "Beobachte in Kombination mit HFV und Schlaf – bei gleichzeitig sinkender HFV ist ein Ruhetag sinnvoll."
      : sentiment === "positive"
        ? "Guter Erholungszustand – spricht für stabile Basis."
        : "Unauffällig, weiter normal trainieren.";

  return { headline, body, sentiment, recommendation };
}

export function explainSleep(rows: DailyMetricRow[]): Explanation {
  const scores = withValues(rows, "sleepScore").map((s) => s.value);
  const durations = withValues(rows, "sleepDurationMin").map((s) => s.value);
  const avgScore = average(scores);
  const avgHours = average(durations) / 60;
  const latestScore = scores[scores.length - 1];

  let sentiment: Sentiment = "neutral";
  if (avgScore < 65 || avgHours < 6.5) sentiment = "negative";
  else if (avgScore >= 80 && avgHours >= 7.5) sentiment = "positive";

  const headline =
    sentiment === "negative"
      ? "Dein Schlaf war zuletzt unterdurchschnittlich"
      : sentiment === "positive"
        ? "Dein Schlaf war zuletzt sehr gut"
        : "Dein Schlaf liegt im normalen Bereich";

  const body = `Ø Schlafdauer: ${avgHours.toFixed(1)} h, Ø Schlaf-Score: ${avgScore.toFixed(0)}, letzter Wert: ${latestScore ?? "–"}. Schlaf ist die wichtigste Stellschraube für Regeneration – er beeinflusst direkt HFV, Ruhepuls und wie gut dein Körper Trainingsreize verarbeitet.`;

  const recommendation =
    sentiment === "negative"
      ? "Priorisiere in den nächsten Nächten mehr Schlaf; reduziere bei Bedarf die Trainingsintensität, bis sich der Schlaf stabilisiert."
      : "Guter Rhythmus – so beibehalten.";

  return { headline, body, sentiment, recommendation };
}

export function explainReadiness(rows: DailyMetricRow[]): Explanation {
  const series = withValues(rows, "readinessScoreV2");
  const values = series.map((s) => s.value);
  const { first, second } = splitHalves(values);
  const avgFirst = average(first);
  const avgSecond = average(second);
  const delta = avgSecond - avgFirst;
  const latest = values[values.length - 1];
  const verdict = [...rows].reverse().find((r) => r.readinessVerdict !== null)?.readinessVerdict;

  let sentiment: Sentiment = "neutral";
  if (latest !== undefined && latest < 25) sentiment = "negative";
  else if (latest !== undefined && latest >= 60) sentiment = "positive";

  const headline =
    sentiment === "negative"
      ? "Deine Trainingsbereitschaft ist aktuell niedrig"
      : sentiment === "positive"
        ? "Deine Trainingsbereitschaft ist aktuell hoch"
        : "Deine Trainingsbereitschaft ist aktuell durchschnittlich";

  const trendText =
    delta >= 8
      ? ` Sie hat sich in den letzten Tagen um ${delta.toFixed(0)} Punkte verbessert.`
      : delta <= -8
        ? ` Sie ist in den letzten Tagen um ${Math.abs(delta).toFixed(0)} Punkte gesunken.`
        : " Sie ist in den letzten Tagen stabil geblieben.";

  const body = `Aktueller Wert: ${latest?.toFixed(0) ?? "–"} / 100${verdict ? ` (${verdict})` : ""}.${trendText} Die Trainingsbereitschaft fasst HFV, Ruhepuls, Schlaf und Trainingsbelastung zu einer Einschätzung zusammen, wie gut dein Körper aktuell für einen intensiven Reiz bereit ist.`;

  const recommendation =
    sentiment === "negative"
      ? "Plane heute eher ein lockeres Training oder einen Ruhetag ein."
      : sentiment === "positive"
        ? "Guter Zeitpunkt für eine intensive Einheit oder einen Test."
        : "Moderates Training ist heute gut vertretbar.";

  return { headline, body, sentiment, recommendation };
}

export interface ReadinessFactor {
  label: string;
  value: string;
  tone: Sentiment;
}

export function getReadinessFactors(rows: DailyMetricRow[]): ReadinessFactor[] {
  const last = [...rows].reverse().find((r) => r.readinessScoreV2 !== null) ?? rows[rows.length - 1];
  if (!last) return [];

  const factors: ReadinessFactor[] = [];

  const recovery = last.readinessDrivers?.find((d) => d.factor === "recovery")?.value ?? last.recoveryScore;
  if (recovery !== null && recovery !== undefined) {
    factors.push({
      label: "Erholung",
      value: recovery >= 70 ? "Ausgezeichnet" : recovery >= 45 ? "Gut" : recovery >= 25 ? "Ausreichend" : "Niedrig",
      tone: recovery >= 45 ? "positive" : recovery >= 25 ? "neutral" : "negative",
    });
  }

  if (last.acwr !== null) {
    factors.push({
      label: "Akute Belastung",
      value: last.acwr < 0.8 ? "Niedrig" : last.acwr <= 1.3 ? "Ausgeglichen" : "Hoch",
      tone: last.acwr >= 0.8 && last.acwr <= 1.3 ? "positive" : "neutral",
    });
  }

  if (last.sleepScore !== null) {
    factors.push({
      label: "Schlaf",
      value:
        last.sleepScore >= 80 ? "Ausgezeichnet" : last.sleepScore >= 65 ? "Gut" : last.sleepScore >= 50 ? "Ausreichend" : "Niedrig",
      tone: last.sleepScore >= 65 ? "positive" : last.sleepScore >= 50 ? "neutral" : "negative",
    });
  }

  if (last.hrvZScore !== null) {
    factors.push({
      label: "HFV-Status",
      value: last.hrvZScore >= 0.5 ? "Hoch" : last.hrvZScore >= -0.5 ? "Ausbalanciert" : "Niedrig",
      tone: last.hrvZScore >= -0.5 ? "positive" : "negative",
    });
  }

  return factors;
}

export function explainLoad(rows: DailyMetricRow[], injuryRisk?: InjuryRiskCache): Explanation {
  const last = rows[rows.length - 1];
  const ctl = last?.ctl ?? 0;
  const atl = last?.atl ?? 0;
  const tsb = last?.tsb ?? 0;
  const rampRate = last?.rampRate ?? 0;
  const isDetraining =
    !!injuryRisk && (injuryRisk.contributors.acwr < 0.6 || injuryRisk.drivers.includes("acwr_detrained"));

  let sentiment: Sentiment = "neutral";
  if (tsb > 15 && isDetraining) sentiment = "neutral";
  else if (tsb > 15) sentiment = "positive";
  else if (tsb < -20) sentiment = "negative";

  const headline =
    tsb > 15 && isDetraining
      ? "Deine hohe Form kommt von Detraining, nicht von Frische"
      : tsb > 15
        ? "Du bist gut erholt und frisch für intensive Reize"
        : tsb < -20
          ? "Du trägst aktuell eine hohe Ermüdung mit dir"
          : "Deine Belastung ist ausgeglichen";

  const body = tsb > 15 && isDetraining
    ? `Fitness (CTL): ${ctl.toFixed(1)}, Ermüdung (ATL): ${atl.toFixed(1)}, Form (TSB): ${tsb.toFixed(1)}, Rampenrate: ${rampRate.toFixed(1)} CTL/Woche. Ein hoher TSB entsteht normalerweise durch gezieltes Tapering nach harter Belastung – hier kommt er aber daher, dass dein Trainingsumfang zuletzt stark gesunken ist (ACWR ${injuryRisk?.contributors.acwr.toFixed(2)}). Das ist Fitnessverlust, keine aufgebaute Frische.`
    : `Fitness (CTL): ${ctl.toFixed(1)}, Ermüdung (ATL): ${atl.toFixed(1)}, Form (TSB): ${tsb.toFixed(1)}, Rampenrate: ${rampRate.toFixed(1)} CTL/Woche. TSB (Form) ist die Differenz aus Fitness und Ermüdung: stark positive Werte bedeuten Frische, aber bei zu langer Dauer auch Formverlust durch zu wenig Reiz; stark negative Werte bedeuten hohe Ermüdung, die kurzfristig vor Wettkämpfen sinnvoll, dauerhaft aber ein Übertrainingsrisiko ist.`;

  const recommendation =
    tsb > 15 && isDetraining
      ? "Steig langsam wieder ins Training ein, statt sofort voll intensiv zu starten – das senkt das Verletzungsrisiko nach der Pause."
      : tsb > 15
        ? "Guter Zeitpunkt für eine intensive Einheit, einen Test oder einen Wettkampf."
        : tsb < -20
          ? "Baue einen Regenerationstag oder eine lockere Einheit ein, bevor die Ermüdung weiter steigt."
          : "Training wie geplant fortsetzen.";

  return { headline, body, sentiment, recommendation };
}

export function explainInjuryRisk(injuryRisk: InjuryRiskCache): Explanation {
  const { index, contributors } = injuryRisk;
  let sentiment: Sentiment = "positive";
  if (index >= 30) sentiment = "negative";
  else if (index >= 12) sentiment = "neutral";

  const headline =
    index >= 30
      ? `Erhöhtes Risiko-Signal (Index ${index})`
      : index >= 12
        ? `Leicht erhöhtes Risiko-Signal (Index ${index})`
        : `Risiko-Index niedrig (${index})`;

  const driverText =
    contributors.acwr < 0.8
      ? "Dein Belastungsverhältnis (ACWR) zeigt Detraining – du hast zuletzt deutlich weniger trainiert als in den Wochen zuvor."
      : contributors.acwr > 1.3
        ? "Dein Belastungsverhältnis (ACWR) ist hoch – die akute Belastung steigt schneller als sich dein Körper anpassen kann."
        : "Dein Belastungsverhältnis (ACWR) liegt im unauffälligen Bereich.";

  const body = `${driverText} Monotonie: ${contributors.monotony.toFixed(2)}, Foster-Strain: ${contributors.strain_foster.toFixed(0)}. Dieser Index kombiniert mehrere Belastungskennzahlen zu einer Wahrscheinlichkeit für Überlastung – er ist kein Diagnoseinstrument, sondern ein Frühwarnsignal.`;

  const recommendation =
    index >= 30
      ? "Trainingsumfang und -intensität in den nächsten Tagen bewusst reduzieren."
      : index >= 12
        ? "Belastung im Blick behalten, aber kein akuter Handlungsbedarf."
        : "Kein erhöhtes Risiko erkennbar.";

  return { headline, body, sentiment, recommendation };
}

export interface Warning {
  level: "info" | "warning" | "critical";
  title: string;
  message: string;
}

export function generateWarnings(
  rows: DailyMetricRow[],
  anomalies: AnomalyEntry[],
  injuryRisk: InjuryRiskCache
): Warning[] {
  const warnings: Warning[] = [];
  const recentAnomalies = anomalies.slice(-5);

  const rhrUp = recentAnomalies.filter((a) => a.metric === "rhr" && a.direction === "up");
  const sleepDown = recentAnomalies.filter((a) => a.metric === "sleep_score" && a.direction === "down");
  const hrvExplanation = explainHrv(rows);

  if (rhrUp.length >= 2 && hrvExplanation.sentiment === "negative") {
    warnings.push({
      level: "warning",
      title: "Anzeichen unzureichender Erholung",
      message:
        "Dein Ruhepuls war an mehreren Tagen ungewöhnlich hoch und deine HFV sinkt gleichzeitig. In Kombination mit deinem Schlaf könnte dies auf unzureichende Erholung oder eine beginnende Erkältung/Erkrankung hindeuten. Heute wäre ein lockeres Training oder ein Ruhetag sinnvoll.",
    });
  } else if (rhrUp.length >= 2) {
    warnings.push({
      level: "info",
      title: "Ruhepuls zuletzt erhöht",
      message: "Dein Ruhepuls war an mehreren der letzten Tage höher als üblich. Beobachte die Entwicklung der nächsten Tage.",
    });
  }

  if (sleepDown.length >= 1) {
    warnings.push({
      level: "info",
      title: "Schlafqualität schwankt",
      message: "Dein Schlaf-Score lag zuletzt an mindestens einem Tag deutlich unter deinem gewohnten Niveau. Achte auf ausreichend Schlaf in den kommenden Nächten.",
    });
  }

  if (injuryRisk.index >= 30) {
    warnings.push({
      level: "critical",
      title: "Erhöhtes Überlastungsrisiko",
      message: "Der Risiko-Index für Überlastung ist deutlich erhöht. Reduziere Umfang und Intensität in den nächsten Tagen.",
    });
  } else if (injuryRisk.contributors.acwr < 0.6) {
    warnings.push({
      level: "info",
      title: "Deutlich reduziertes Trainingsvolumen",
      message: "Dein Belastungsverhältnis zeigt starkes Detraining – dein Trainingsumfang war zuletzt deutlich niedriger als in den Vorwochen. Ein zu abrupter Wiedereinstieg mit hoher Intensität erhöht das Verletzungsrisiko.",
    });
  }

  return warnings;
}

export function generateTodayRecommendation(rows: DailyMetricRow[], injuryRisk: InjuryRiskCache): string {
  const last = rows[rows.length - 1];
  const prevWithData = [...rows].reverse().find((r) => r.recoveryScore !== null);
  const recovery = prevWithData?.recoveryScore ?? null;
  const tsb = last?.tsb ?? prevWithData?.tsb ?? 0;

  if (recovery !== null && recovery < 25) {
    return "Deine Erholung ist aktuell niedrig. Plane heute ein lockeres Training oder einen vollständigen Ruhetag – priorisiere Schlaf und Regeneration.";
  }
  if (injuryRisk.index >= 30) {
    return "Das Überlastungsrisiko ist erhöht – reduziere Umfang und Intensität und baue zusätzliche Erholung ein.";
  }
  const isDetraining = injuryRisk.contributors.acwr < 0.6 || injuryRisk.drivers.includes("acwr_detrained");
  if (tsb > 15 && isDetraining) {
    return "Deine Form (TSB) ist zwar hoch, aber weil du zuletzt deutlich weniger trainiert hast als in den Wochen zuvor – das ist Detraining, keine Frische durch harte Vorbelastung. Steig lieber schrittweise wieder ein, statt sofort voll intensiv zu trainieren, um das Verletzungsrisiko durch den abrupten Belastungssprung nicht zu erhöhen.";
  }
  if (tsb > 15) {
    return "Du bist frisch und gut erholt. Ein intensives Training, ein Test oder ein Wettkampf sind heute gut vertretbar.";
  }
  if (recovery !== null && recovery >= 60) {
    return "Guter Erholungszustand – ein anspruchsvolles Training ist heute möglich.";
  }
  return "Solides mittleres Training passend zu deinem aktuellen Trainingsplan ist heute sinnvoll.";
}
