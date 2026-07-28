import { getDailyMetrics, getInjuryRisk, getTrainingTrends } from "@/lib/data/store";
import { explainInjuryRisk, explainSleep } from "@/lib/insights";
import { ChartCard } from "@/components/charts/ChartCard";
import { Card } from "@/components/ui/Card";
import { TrendChart } from "@/components/charts/TrendChart";

export default async function HealthPage() {
  const daily = await getDailyMetrics();
  const trends = await getTrainingTrends();
  const injuryRisk = await getInjuryRisk();
  const rows = daily.rows;

  const sleepData = rows.map((r) => ({
    date: r.date,
    sleepScore: r.sleepScore,
    sleepHours: r.sleepDurationMin ? +(r.sleepDurationMin / 60).toFixed(1) : null,
  }));

  const weightData = rows
    .filter((r) => r.weight !== null)
    .map((r) => ({ date: r.date, weight: r.weight }));

  const injuryData = injuryRisk.trend_14d.map((d) => ({ date: d.date, index: d.index }));

  const sleepExplanation = explainSleep(rows);
  const injuryExplanation = explainInjuryRisk(injuryRisk);

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="border-b border-border px-8 py-5">
        <h1 className="text-xl font-semibold">Gesundheit & Regeneration</h1>
        <p className="text-sm text-muted mt-0.5">HRV, Ruhepuls und Trends findest du auf dem Dashboard — hier vertiefte Regenerationsdaten.</p>
      </header>

      <div className="p-8 space-y-6">
        <section className="grid md:grid-cols-2 gap-6">
          <ChartCard
            title="Schlaf-Score (14 Tage)"
            subtitle={`Ø ${trends.sleep.avg_duration_hours} h Schlafdauer`}
            data={sleepData}
            lines={[{ key: "sleepScore", color: "var(--accent)", name: "Schlaf-Score" }]}
            explanation={sleepExplanation}
          />

          <ChartCard
            title="Überlastungsrisiko-Index (14 Tage)"
            subtitle="Kombiniertes Frühwarnsignal, keine Diagnose"
            data={injuryData}
            lines={[{ key: "index", color: "var(--negative)", name: "Risiko-Index" }]}
            explanation={injuryExplanation}
          />
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <Card title="Schlafdauer (Stunden pro Nacht)">
            <TrendChart
              data={sleepData}
              lines={[{ key: "sleepHours", color: "var(--positive)", name: "Stunden" }]}
              referenceLine={7.5}
            />
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
      </div>
    </div>
  );
}
