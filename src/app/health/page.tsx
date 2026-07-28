import { getAnomalies, getDailyMetrics, getInjuryRisk, getTrainingTrends } from "@/lib/data/store";
import {
  explainHrv,
  explainInjuryRisk,
  explainLoad,
  explainReadiness,
  explainRhr,
  explainSleep,
  getReadinessFactors,
} from "@/lib/insights";
import { ChartCard } from "@/components/charts/ChartCard";
import { Card } from "@/components/ui/Card";
import { TrendChart } from "@/components/charts/TrendChart";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { ExplanationPanel } from "@/components/ui/ExplanationPanel";
import { MetricGauge } from "@/components/ui/MetricGauge";
import { SleepDetailSection } from "@/components/health/SleepDetailSection";
import { formatDate, readinessVerdictLabel } from "@/lib/format";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";

export default async function HealthPage() {
  const daily = await getDailyMetrics();
  const trends = await getTrainingTrends();
  const injuryRisk = await getInjuryRisk();
  const anomalies = await getAnomalies();
  const rows = daily.rows;

  const sleepData = rows.map((r) => ({
    date: r.date,
    sleepScore: r.sleepScore,
    sleepHours: r.sleepDurationMin ? +(r.sleepDurationMin / 60).toFixed(1) : null,
    sleepDebtHours: r.sleepDebtMin !== null ? +(r.sleepDebtMin / 60).toFixed(1) : null,
  }));

  const weightData = rows
    .filter((r) => r.weight !== null)
    .map((r) => ({ date: r.date, weight: r.weight }));

  const injuryData = injuryRisk.trend_14d.map((d) => ({ date: d.date, index: d.index }));

  const hrvBaselineData = rows.map((r) => ({ date: r.date, hrv: r.hrv, baseline: r.hrvBaseline60d }));
  const rhrBaselineData = rows.map((r) => ({ date: r.date, restingHr: r.restingHr, baseline: r.rhrBaseline60d }));
  const acwrData = rows.map((r) => ({ date: r.date, acwr: r.acwr }));
  const tsbData = rows.map((r) => ({ date: r.date, tsb: r.tsb }));
  const readinessData = rows.map((r) => ({ date: r.date, readinessScoreV2: r.readinessScoreV2 }));

  const sleepExplanation = explainSleep(rows);
  const injuryExplanation = explainInjuryRisk(injuryRisk);
  const hrvExplanation = explainHrv(rows);
  const rhrExplanation = explainRhr(rows);
  const loadExplanation = explainLoad(rows, injuryRisk);
  const readinessExplanation = explainReadiness(rows);
  const readinessFactors = getReadinessFactors(rows);
  const lastWithRecovery = [...rows].reverse().find((r) => r.recoveryScore !== null);

  const ACTIVITY_METRIC_LABELS: Record<string, string> = {
    rhr: "Ruhepuls",
    hrv: "HFV",
    sleep_score: "Schlaf-Score",
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="border-b border-border px-8 py-5">
        <h1 className="text-xl font-semibold">Gesundheit & Regeneration</h1>
        <p className="text-sm text-muted mt-0.5">Vertiefte Regenerationsdaten — mit Basiswert-Vergleich und Frühwarnsignalen.</p>
      </header>

      <div className="p-8 space-y-6">
        <Card title="Trainingsbereitschaft" subtitle="Kombiniert HFV, Ruhepuls, Schlaf und Belastung">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            <div className="shrink-0">
              <MetricGauge
                value={lastWithRecovery?.readinessScoreV2 ?? 0}
                label={readinessVerdictLabel(lastWithRecovery?.readinessVerdict)}
              />
            </div>
            {readinessFactors.length > 0 && (
              <div className="grid grid-cols-2 gap-3 flex-1 w-full">
                {readinessFactors.map((f) => (
                  <div key={f.label} className="rounded-lg border border-border bg-surface-raised px-3 py-2">
                    <p className="text-xs text-muted">{f.label}</p>
                    <p
                      className={
                        "text-sm font-medium " +
                        (f.tone === "positive"
                          ? "text-positive"
                          : f.tone === "negative"
                            ? "text-negative"
                            : "text-foreground")
                      }
                    >
                      {f.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4">
            <TrendChart
              data={readinessData}
              lines={[{ key: "readinessScoreV2", color: "var(--accent)", name: "Trainingsbereitschaft" }]}
            />
          </div>
          <div className="mt-4">
            <ExplanationPanel explanation={readinessExplanation} />
          </div>
        </Card>

        <SleepDetailSection />

        <section className="grid md:grid-cols-2 gap-6 scroll-mt-6">
          <div id="sleep-chart">
            <ChartCard
              title="Schlaf-Score (14 Tage)"
              subtitle={`Ø ${trends.sleep.avg_duration_hours} h Schlafdauer`}
              data={sleepData}
              lines={[{ key: "sleepScore", color: "var(--accent)", name: "Schlaf-Score" }]}
              explanation={sleepExplanation}
            />
          </div>

          <div id="injury-risk-chart">
            <ChartCard
              title="Überlastungsrisiko-Index (14 Tage)"
              subtitle="Kombiniertes Frühwarnsignal, keine Diagnose"
              data={injuryData}
              lines={[{ key: "index", color: "var(--negative)", name: "Risiko-Index" }]}
              explanation={injuryExplanation}
            />
          </div>
        </section>

        <section>
          <ChartCard
            title="Form / TSB (14 Tage)"
            subtitle="Training Stress Balance"
            data={tsbData}
            lines={[{ key: "tsb", color: "var(--positive)", name: "TSB" }]}
            explanation={loadExplanation}
            referenceLine={0}
          />
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <Card
            title="HFV vs. 60-Tage-Basiswert"
            subtitle="Zeigt Abweichungen von deinem persönlichen Normalbereich"
          >
            <TrendChart
              data={hrvBaselineData}
              lines={[
                { key: "hrv", color: "var(--accent)", name: "HFV (ms)" },
                { key: "baseline", color: "var(--muted)", name: "60-Tage-Basiswert" },
              ]}
            />
            <div className="mt-4">
              <ExplanationPanel explanation={hrvExplanation} />
            </div>
          </Card>

          <Card
            title="Ruhepuls vs. 60-Tage-Basiswert"
            subtitle="Zeigt Abweichungen von deinem persönlichen Normalbereich"
          >
            <TrendChart
              data={rhrBaselineData}
              lines={[
                { key: "restingHr", color: "var(--warning)", name: "Ruhepuls (bpm)" },
                { key: "baseline", color: "var(--muted)", name: "60-Tage-Basiswert" },
              ]}
            />
            <div className="mt-4">
              <ExplanationPanel explanation={rhrExplanation} />
            </div>
          </Card>
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <Card title="Schlafdauer (Stunden pro Nacht)">
            <TrendChart
              data={sleepData}
              lines={[{ key: "sleepHours", color: "var(--positive)", name: "Stunden" }]}
              referenceLine={7.5}
            />
          </Card>

          <Card title="Schlafdefizit (Stunden)" subtitle="Aufgestaute Schlafschuld gegenüber deinem Schlafbedarf">
            <TrendChart
              data={sleepData}
              lines={[{ key: "sleepDebtHours", color: "var(--negative)", name: "Defizit (h)" }]}
              referenceLine={0}
            />
          </Card>
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <Card
            title={
              <span className="flex items-center gap-1.5">
                ACWR-Verlauf <InfoTooltip term="acwr" />
              </span>
            }
            subtitle="Verhältnis akute zu chronische Trainingsbelastung"
          >
            <TrendChart data={acwrData} lines={[{ key: "acwr", color: "var(--accent)", name: "ACWR" }]} referenceLine={1} />
          </Card>

          <Card title="Gewicht" subtitle={weightData.length > 0 ? undefined : "Noch keine Gewichtsdaten in diesem Zeitraum"}>
            {weightData.length > 0 ? (
              <TrendChart data={weightData} lines={[{ key: "weight", color: "var(--accent)", name: "Gewicht (kg)" }]} />
            ) : (
              <p className="text-sm text-muted py-8 text-center">
                Keine Gewichtsmessung in den letzten 14 Tagen. Sobald neue Werte über einen verbundenen Anbieter erfasst werden, erscheinen sie hier automatisch.
              </p>
            )}
          </Card>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Anomalien-Verlauf</h2>
          <div className="rounded-xl border border-border bg-surface divide-y divide-border">
            {anomalies.anomalies.length === 0 && (
              <p className="text-sm text-muted p-4">Keine Anomalien im aktuellen Zeitraum erkannt.</p>
            )}
            {anomalies.anomalies.map((a, i) => {
              const Icon = a.direction === "up" ? TrendingUp : TrendingDown;
              return (
                <div key={i} className="flex items-center gap-3 p-4">
                  <AlertTriangle size={15} className="text-warning shrink-0" />
                  <span className="text-sm flex-1">
                    {ACTIVITY_METRIC_LABELS[a.metric] ?? a.metric} war {a.direction === "up" ? "ungewöhnlich hoch" : "ungewöhnlich niedrig"}
                  </span>
                  <Icon size={14} className={a.direction === "up" ? "text-negative" : "text-warning"} />
                  <span className="text-xs text-muted w-12 text-right">z={a.zScore.toFixed(1)}</span>
                  <span className="text-xs text-muted w-20 text-right">{formatDate(a.date)}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
