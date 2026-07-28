import {
  getAnomalies,
  getCompetitions,
  getDailyMetrics,
  getGoals,
  getInjuryRisk,
  getTrainingTrends,
} from "@/lib/data/store";
import {
  explainHrv,
  explainLoad,
  explainRhr,
  generateTodayRecommendation,
  generateWarnings,
} from "@/lib/insights";
import { StatTile } from "@/components/ui/StatTile";
import { WarningBanner } from "@/components/ui/WarningBanner";
import { Card } from "@/components/ui/Card";
import { ChartCard } from "@/components/charts/ChartCard";
import { HeartPulse, Moon, Activity, ShieldAlert, Lightbulb, Trophy, Target } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const daily = await getDailyMetrics();
  const trends = await getTrainingTrends();
  const injuryRisk = await getInjuryRisk();
  const anomalies = await getAnomalies();
  const goals = await getGoals();
  const competitions = await getCompetitions();

  const rows = daily.rows;
  const last = rows[rows.length - 1];
  const lastWithRecovery = [...rows].reverse().find((r) => r.recoveryScore !== null);

  const warnings = generateWarnings(rows, anomalies.anomalies, injuryRisk);
  const recommendation = generateTodayRecommendation(rows, injuryRisk);

  const hrvExplanation = explainHrv(rows);
  const rhrExplanation = explainRhr(rows);
  const loadExplanation = explainLoad(rows);

  const chartData = rows.map((r) => ({
    date: r.date,
    hrv: r.hrv,
    restingHr: r.restingHr,
    tsb: r.tsb,
  }));

  const upcomingGoals = goals.slice(0, 3);
  const recentCompetitions = competitions.slice(0, 3);

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="border-b border-border px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted mt-0.5">Stand: {new Date(daily.fetchedAt).toLocaleString("de-DE")}</p>
        </div>
      </header>

      <div className="p-8 space-y-8">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile
            label="Trainingsbereitschaft"
            value={lastWithRecovery?.readinessScoreV2 ?? "–"}
            unit="/ 100"
            icon={Activity}
            tone={
              (lastWithRecovery?.readinessScoreV2 ?? 50) < 25
                ? "negative"
                : (lastWithRecovery?.readinessScoreV2 ?? 50) >= 60
                  ? "positive"
                  : "neutral"
            }
            hint={lastWithRecovery?.readinessVerdict ?? undefined}
          />
          <StatTile
            label="Recovery Score"
            value={lastWithRecovery?.recoveryScore ?? "–"}
            unit="/ 100"
            icon={HeartPulse}
            tone={
              (lastWithRecovery?.recoveryScore ?? 50) < 25
                ? "negative"
                : (lastWithRecovery?.recoveryScore ?? 50) >= 60
                  ? "positive"
                  : "neutral"
            }
          />
          <StatTile
            label="HRV"
            value={last.hrv ?? trends.recovery.hrv_values.at(-1)?.hrv ?? "–"}
            unit="ms"
            icon={Activity}
            tone={trends.recovery.hrv_trend === "declining" ? "warning" : "neutral"}
            hint={`Trend: ${trends.recovery.hrv_trend}`}
          />
          <StatTile
            label="Ruhepuls"
            value={last.restingHr ?? trends.recovery.rhr_values.at(-1)?.rhr ?? "–"}
            unit="bpm"
            icon={HeartPulse}
            tone={trends.recovery.rhr_trend === "rising" ? "warning" : "neutral"}
            hint={`Trend: ${trends.recovery.rhr_trend}`}
          />
          <StatTile
            label="Schlaf"
            value={trends.sleep.avg_score}
            unit="Score"
            icon={Moon}
            hint={`Ø ${trends.sleep.avg_duration_hours} h`}
          />
          <StatTile
            label="Trainingsbelastung (TSB)"
            value={last.tsb ?? "–"}
            unit="Form"
            icon={Activity}
            tone={(last.tsb ?? 0) < -20 ? "negative" : (last.tsb ?? 0) > 15 ? "positive" : "neutral"}
          />
          <StatTile
            label="Überlastungsrisiko"
            value={injuryRisk.index}
            unit="Index"
            icon={ShieldAlert}
            tone={injuryRisk.index >= 30 ? "negative" : injuryRisk.index >= 12 ? "warning" : "positive"}
          />
          <StatTile
            label="Aktive Ziele"
            value={goals.length}
            icon={Target}
          />
        </section>

        <section className="rounded-xl border border-accent/30 bg-accent-soft p-4 flex gap-3 items-start">
          <Lightbulb size={18} className="text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Heutige Empfehlung</p>
            <p className="text-sm text-foreground/90 mt-0.5">{recommendation}</p>
          </div>
        </section>

        {warnings.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Warnungen</h2>
            {warnings.map((w, i) => (
              <WarningBanner key={i} warning={w} />
            ))}
          </section>
        )}

        <section className="grid md:grid-cols-2 gap-6">
          <ChartCard
            title="HRV (14 Tage)"
            subtitle="Herzfrequenzvariabilität"
            data={chartData}
            lines={[{ key: "hrv", color: "var(--accent)", name: "HRV (ms)" }]}
            explanation={hrvExplanation}
          />
          <ChartCard
            title="Ruhepuls (14 Tage)"
            data={chartData}
            lines={[{ key: "restingHr", color: "var(--warning)", name: "Ruhepuls (bpm)" }]}
            explanation={rhrExplanation}
          />
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <ChartCard
            title="Form / TSB (14 Tage)"
            subtitle="Training Stress Balance"
            data={chartData}
            lines={[{ key: "tsb", color: "var(--positive)", name: "TSB" }]}
            explanation={loadExplanation}
            referenceLine={0}
          />

          <Card title="Ziele & Wettkämpfe" action={<Link href="/goals" className="text-xs text-accent">Alle Ziele →</Link>}>
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-muted uppercase mb-2">Aktuelle Ziele</h4>
                <div className="space-y-2">
                  {upcomingGoals.length === 0 && <p className="text-sm text-muted">Keine Ziele hinterlegt.</p>}
                  {upcomingGoals.map((g) => (
                    <div key={g.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{g.title}</span>
                      <span className="text-muted shrink-0 ml-2">{g.targetDate}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-3 border-t border-border">
                <h4 className="text-xs font-semibold text-muted uppercase mb-2 flex items-center gap-1.5">
                  <Trophy size={13} /> Wettkämpfe
                </h4>
                <div className="space-y-2">
                  {recentCompetitions.length === 0 && (
                    <p className="text-sm text-muted">Noch keine Wettkämpfe erfasst.</p>
                  )}
                  {recentCompetitions.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{c.name}</span>
                      <span className="text-muted shrink-0 ml-2">{c.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
