import { getDailyMetrics } from "@/lib/data/store";
import { computeSleepPerformance, computeStrain } from "@/lib/insights";
import { recoveryZustandStatus, sleepZustandStatus, loadZustandStatus, type ZustandStatus } from "@/lib/today";
import type { DailyMetricRow } from "@/lib/types";

export type ZustandMetric = "erholung" | "schlaf" | "belastung";

export type ZustandTrendPoint = { day: string; value: number; status: ZustandStatus };
export type ZustandFactor = { name: string; value: string; delta: string; status: ZustandStatus; width: number };
export type ZustandDetail = {
  metric: ZustandMetric;
  label: string;
  subtitle: string;
  value: number;
  unit: string;
  status: ZustandStatus;
  statusLabel: string;
  headline: string;
  coachText: string;
  trend: ZustandTrendPoint[];
  factors: ZustandFactor[];
};

const WEEKDAY = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function dayLabel(dateStr: string): string {
  return WEEKDAY[new Date(`${dateStr}T12:00:00Z`).getUTCDay()];
}

function clampWidth(n: number): number {
  return Math.max(5, Math.min(95, Math.round(n)));
}

/** Maps a z-score to a 5-95 visual bar width — purely for the "how far from usual" bar length,
 * direction/good-or-bad is decided separately per factor since high isn't always good (e.g. RHR). */
function zScoreWidth(z: number): number {
  return clampWidth(50 + z * 20);
}

function belastungValue(row: DailyMetricRow): number | null {
  if (row.dailyLoad === null) return null;
  return Math.min(10, computeStrain(row.dailyLoad) / 2.1);
}

function recoveryTrend(rows: DailyMetricRow[]): ZustandTrendPoint[] {
  return rows
    .filter((r) => r.recoveryScore !== null)
    .slice(-14)
    .map((r) => ({ day: dayLabel(r.date), value: Math.round(r.recoveryScore as number), status: recoveryZustandStatus(r.recoveryScore) }));
}

function sleepTrend(rows: DailyMetricRow[]): ZustandTrendPoint[] {
  return rows
    .filter((r) => r.sleepDurationMin !== null && r.sleepNeedMin !== null)
    .slice(-14)
    .map((r) => {
      const pct = computeSleepPerformance(r.sleepDurationMin, r.sleepNeedMin) as number;
      return { day: dayLabel(r.date), value: Math.round(Math.min(100, pct)), status: sleepZustandStatus(pct) };
    });
}

function belastungTrend(rows: DailyMetricRow[]): ZustandTrendPoint[] {
  return rows
    .filter((r) => r.dailyLoad !== null)
    .slice(-14)
    .map((r) => {
      const value = belastungValue(r) ?? 0;
      return { day: dayLabel(r.date), value: Math.round(value * 10) / 10, status: loadZustandStatus(value) };
    });
}

function statusLabelFor(metric: ZustandMetric, status: ZustandStatus): string {
  if (metric === "erholung") return status === "good" ? "Belastbar" : status === "watch" ? "Bedingt belastbar" : "Niedrig";
  if (metric === "schlaf") return status === "good" ? "Im Zielband" : status === "watch" ? "Unter Bedarf" : "Deutlich unter Bedarf";
  return status === "good" ? "Im Zielband" : status === "watch" ? "Erhöht" : "Deutlich über Zielband";
}

function recoveryDetail(rows: DailyMetricRow[]): ZustandDetail | null {
  const last = [...rows].reverse().find((r) => r.recoveryScore !== null);
  if (!last || last.recoveryScore === null) return null;
  const value = last.recoveryScore;
  const status = recoveryZustandStatus(value);
  const trend = recoveryTrend(rows);

  const factors: ZustandFactor[] = [];
  if (last.hrv !== null && last.hrvBaseline60d !== null) {
    const z = last.hrvZScore ?? 0;
    const delta = Math.round((last.hrv - last.hrvBaseline60d) * 10) / 10;
    factors.push({ name: "HRV vs. Basiswert", value: `${Math.round(last.hrv)} ms`, delta: `${delta >= 0 ? "+" : ""}${delta} ms`, status: z >= 0 ? "good" : z >= -1 ? "watch" : "risk", width: zScoreWidth(z) });
  }
  if (last.restingHr !== null && last.rhrBaseline60d !== null) {
    const z = last.rhrZScore ?? 0;
    const delta = Math.round((last.restingHr - last.rhrBaseline60d) * 10) / 10;
    // Higher-than-baseline resting heart rate is the unfavorable direction, unlike HRV.
    factors.push({ name: "Ruhepuls vs. Basiswert", value: `${Math.round(last.restingHr)} bpm`, delta: `${delta >= 0 ? "+" : ""}${delta} bpm`, status: z <= 0 ? "good" : z <= 1 ? "watch" : "risk", width: zScoreWidth(z) });
  }
  const sleepPerf = computeSleepPerformance(last.sleepDurationMin, last.sleepNeedMin);
  if (sleepPerf !== null) {
    factors.push({ name: "Schlaf letzte Nacht", value: `${Math.round(sleepPerf)} % des Bedarfs`, delta: statusLabelFor("schlaf", sleepZustandStatus(sleepPerf)), status: sleepZustandStatus(sleepPerf), width: clampWidth(sleepPerf) });
  }

  const headline = status === "good" ? "Volle Einheit – dein Körper trägt den Plan" : status === "watch" ? "Technik und Tempo tragen – harter Umfang nicht" : "Heute bewusst kurz und locker halten";
  const coachText = status === "good" ? "Deine Erholung liegt im Zielband. Nutze das Fenster für die geplante Belastung." : status === "watch" ? "Deine Erholung ist eingeschränkt. Halte die Einheit technisch sauber statt umfangreich." : "Deine Erholung ist niedrig. Priorisiere heute Regeneration vor zusätzlichem Umfang.";

  return { metric: "erholung", label: "Erholung", subtitle: "Belastbarkeit für die heutige Einheit", value: Math.round(value), unit: "%", status, statusLabel: statusLabelFor("erholung", status), headline, coachText, trend, factors };
}

function schlafDetail(rows: DailyMetricRow[]): ZustandDetail | null {
  const last = [...rows].reverse().find((r) => r.sleepDurationMin !== null && r.sleepNeedMin !== null);
  if (!last) return null;
  const value = computeSleepPerformance(last.sleepDurationMin, last.sleepNeedMin) as number;
  const status = sleepZustandStatus(value);
  const trend = sleepTrend(rows);

  const factors: ZustandFactor[] = [];
  const hours = (last.sleepDurationMin as number) / 60;
  const needHours = (last.sleepNeedMin as number) / 60;
  factors.push({ name: "Schlafdauer", value: `${hours.toFixed(1)} h`, delta: `Bedarf ${needHours.toFixed(1)} h`, status, width: clampWidth(value) });
  if (last.sleepScore !== null) {
    const scoreStatus: ZustandStatus = last.sleepScore >= 80 ? "good" : last.sleepScore >= 60 ? "watch" : "risk";
    const scoreLabel = scoreStatus === "good" ? "Gut" : scoreStatus === "watch" ? "Durchwachsen" : "Niedrig";
    factors.push({ name: "Schlafscore", value: `${Math.round(last.sleepScore)}`, delta: scoreLabel, status: scoreStatus, width: clampWidth(last.sleepScore) });
  }
  if (last.sleepDebtMin !== null) {
    const debtStatus: ZustandStatus = last.sleepDebtMin <= 30 ? "good" : last.sleepDebtMin <= 90 ? "watch" : "risk";
    factors.push({ name: "Schlafdefizit", value: `${Math.round(last.sleepDebtMin)} min`, delta: last.sleepDebtMin <= 30 ? "Gering" : "Baut sich auf", status: debtStatus, width: clampWidth(100 - last.sleepDebtMin / 2) });
  }

  const headline = status === "good" ? "Die Nacht hat geliefert – nutze das Fenster" : status === "watch" ? "Schlaf unter Bedarf – heute nicht zusätzlich sparen" : "Schlafdefizit deutlich – Erholung heute priorisieren";
  const coachText = status === "good" ? "Dein Schlaf lag im Zielband. Das ist eine gute Basis für die geplante Einheit." : status === "watch" ? "Dein Schlaf lag unter deinem Bedarf. Achte heute zusätzlich auf frühes Zubettgehen." : "Dein Schlafdefizit ist spürbar. Wo möglich, priorisiere heute Schlaf vor zusätzlichem Training.";

  return { metric: "schlaf", label: "Schlaf", subtitle: "Erholungsbasis der letzten Nacht", value: Math.round(Math.min(100, value)), unit: "% des Bedarfs", status, statusLabel: statusLabelFor("schlaf", status), headline, coachText, trend, factors };
}

function belastungDetail(rows: DailyMetricRow[]): ZustandDetail | null {
  const last = [...rows].reverse().find((r) => r.dailyLoad !== null);
  if (!last) return null;
  const value = belastungValue(last) as number;
  const status = loadZustandStatus(value);
  const trend = belastungTrend(rows);

  const factors: ZustandFactor[] = [];
  if (last.acwr !== null) {
    const acwrStatus: ZustandStatus = last.acwr > 1.5 ? "risk" : last.acwr > 1.2 ? "watch" : "good";
    factors.push({ name: "Verhältnis kurz-/langfristig", value: last.acwr.toFixed(2), delta: acwrStatus === "good" ? "Ausgewogen" : "Kurzfristig erhöht", status: acwrStatus, width: clampWidth(last.acwr * 50) });
  }
  if (last.rampRate !== null) {
    const rampAbs = Math.abs(last.rampRate);
    const rampStatus: ZustandStatus = rampAbs > 8 ? "risk" : rampAbs > 5 ? "watch" : "good";
    factors.push({ name: "Trainingssteigerung pro Woche", value: `${last.rampRate >= 0 ? "+" : ""}${last.rampRate.toFixed(1)} CTL`, delta: rampStatus === "good" ? "Moderat" : "Zügig", status: rampStatus, width: clampWidth(50 + last.rampRate * 4) });
  }
  if (last.tsb !== null) {
    const tsbStatus: ZustandStatus = last.tsb < -20 ? "risk" : last.tsb < -10 ? "watch" : "good";
    factors.push({ name: "Form", value: last.tsb.toFixed(1), delta: tsbStatus === "good" ? "Frisch genug" : tsbStatus === "watch" ? "Angespannt" : "Tief im Minus", status: tsbStatus, width: clampWidth(50 + last.tsb) });
  }

  const headline = status === "good" ? "Belastung im Rahmen – Plan trägt" : status === "watch" ? "Belastung erhöht – heute nicht draufpacken" : "Belastung deutlich über Zielband – Umfang senken";
  const coachText = status === "good" ? "Deine Belastung liegt im üblichen Rahmen. Der Plan passt zu deiner aktuellen Form." : status === "watch" ? "Deine Belastung ist erhöht. Halte den heutigen Umfang, statt weiter draufzupacken." : "Deine Belastung liegt deutlich über deinem Zielband. Ein ruhigerer Block würde die Woche stabilisieren.";

  return { metric: "belastung", label: "Belastung", subtitle: "Tagesbelastung im Verhältnis zur Form", value: Math.round(value * 10) / 10, unit: "von 10", status, statusLabel: statusLabelFor("belastung", status), headline, coachText, trend, factors };
}

export async function buildZustandDetail(metric: ZustandMetric): Promise<ZustandDetail | null> {
  const daily = await getDailyMetrics();
  if (metric === "erholung") return recoveryDetail(daily.rows);
  if (metric === "schlaf") return schlafDetail(daily.rows);
  return belastungDetail(daily.rows);
}
