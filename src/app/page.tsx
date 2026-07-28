import { getAnomalies, getCompetitions, getDailyMetrics, getGoals, getInjuryRisk } from "@/lib/data/store";
import {
  computeSleepPerformance,
  computeStrain,
  generateTodayRecommendation,
  generateWarnings,
  recoveryLabel,
  sleepPerformanceLabel,
  strainLabel,
} from "@/lib/insights";
import { WarningBanner } from "@/components/ui/WarningBanner";
import { Card } from "@/components/ui/Card";
import { MetricGauge } from "@/components/ui/MetricGauge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { formatDate } from "@/lib/format";
import { Lightbulb, Trophy } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const daily = await getDailyMetrics();
  const injuryRisk = await getInjuryRisk();
  const anomalies = await getAnomalies();
  const goals = await getGoals();
  const competitions = await getCompetitions();

  const rows = daily.rows;
  const lastWithRecovery = [...rows].reverse().find((r) => r.recoveryScore !== null);
  const lastWithLoad = [...rows].reverse().find((r) => r.dailyLoad !== null);
  const lastWithSleep = [...rows].reverse().find((r) => r.sleepDurationMin !== null && r.sleepNeedMin !== null);

  const recoveryPct = lastWithRecovery?.recoveryScore ?? null;
  const strain = computeStrain(lastWithLoad?.dailyLoad ?? null);
  const sleepPerformance = computeSleepPerformance(lastWithSleep?.sleepDurationMin, lastWithSleep?.sleepNeedMin);

  const warnings = generateWarnings(rows, anomalies.anomalies, injuryRisk);
  const recommendation = generateTodayRecommendation(rows, injuryRisk);

  const activeGoals = goals.filter((g) => !g.achieved);
  const upcomingGoals = activeGoals.slice(0, 3);
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
        <section className="grid md:grid-cols-3 gap-6">
          <Card
            title={
              <span className="flex items-center gap-1.5">
                Erholung <InfoTooltip term="recoveryScore" />
              </span>
            }
          >
            <div className="flex justify-center py-2">
              <MetricGauge value={recoveryPct ?? 0} label={recoveryPct != null ? recoveryLabel(recoveryPct) : undefined} />
            </div>
          </Card>
          <Card
            title={
              <span className="flex items-center gap-1.5">
                Belastung <InfoTooltip term="strain" />
              </span>
            }
          >
            <div className="flex justify-center py-2">
              <MetricGauge value={strain} max={21} decimals={1} label={strainLabel(strain)} />
            </div>
          </Card>
          <Card
            title={
              <span className="flex items-center gap-1.5">
                Schlaf-Performance <InfoTooltip term="sleepPerformance" />
              </span>
            }
          >
            <div className="flex justify-center py-2">
              <MetricGauge
                value={sleepPerformance ?? 0}
                label={sleepPerformance != null ? sleepPerformanceLabel(sleepPerformance) : undefined}
              />
            </div>
          </Card>
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

        <Card title="Ziele & Wettkämpfe" action={<Link href="/goals" className="text-xs text-accent">Alle Ziele →</Link>}>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-semibold text-muted uppercase mb-2">Aktuelle Ziele</h4>
              <div className="space-y-2">
                {upcomingGoals.length === 0 && <p className="text-sm text-muted">Keine Ziele hinterlegt.</p>}
                {upcomingGoals.map((g) => (
                  <div key={g.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{g.title}</span>
                    <span className="text-muted shrink-0 ml-2">{formatDate(g.targetDate)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:pl-6 md:border-l border-border pt-4 md:pt-0 border-t md:border-t-0">
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
                    <span className="text-muted shrink-0 ml-2">{formatDate(c.date)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
