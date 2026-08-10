import { getActivities, getAnalyticsSummary, getPerformanceEstimates } from "@/lib/data/store";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/layout/PageShell";
import { VolumeBarChart } from "@/components/charts/VolumeBarChart";
import { HrZonesChart } from "@/components/charts/HrZonesChart";
import { activityLabel, translatePowerProfileTerm } from "@/lib/format";
import { Activity as ActivityIcon, Calculator, ChevronDown } from "lucide-react";
import { PhotoAnalysis } from "@/components/training/PhotoAnalysis";
import { Concept2PaceCalculator } from "@/components/training/Concept2PaceCalculator";
import { TrainingActivityList } from "@/components/training/TrainingActivityList";

export default async function TrainingPage() {
  const { activities } = await getActivities();
  const analytics = await getAnalyticsSummary();
  const perf = await getPerformanceEstimates();
  const ftpLabel = Number.isFinite(perf?.ftp_watts) ? `${perf.ftp_watts.toFixed(0)} W` : "Noch nicht ermittelt";
  const powerProfile = perf?.power_profile;
  const archetypeLabel = powerProfile?.archetype
    ? translatePowerProfileTerm(powerProfile.archetype)
    : "Noch nicht ermittelt";
  const strengthsLabel = powerProfile?.strengths?.length
    ? powerProfile.strengths.map(translatePowerProfileTerm).join(", ")
    : "Noch nicht ermittelt";
  const limitersLabel = powerProfile?.limiters?.length
    ? powerProfile.limiters.map(translatePowerProfileTerm).join(", ")
    : "Noch nicht ermittelt";
  const currentWeek = analytics.weekly_volume.at(-1);
  const latestActivity = activities[0];
  const currentWeekHours = Number.isFinite(currentWeek?.hours) ? `${currentWeek!.hours.toFixed(1)} h` : "–";

  return (
    <PageShell title="Dein Training" subtitle="Einheiten verstehen, Fortschritt erkennen und gezielt besser werden.">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(19rem,1fr)]">
          <Card className="border-accent/35 bg-[linear-gradient(135deg,rgba(37,216,207,0.10),rgba(16,22,29,0.92)_58%)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Diese Trainingswoche</p>
                <h2 className="mt-2 text-2xl font-semibold">Dein Training auf einen Blick</h2>
                <p className="mt-1 text-sm text-muted">Umfang, Einheiten und der letzte Trainingsreiz – ohne Zahlensalat.</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent/35 bg-accent-soft text-accent">
                <ActivityIcon size={22} />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-background/35 py-4">
              <div className="px-4">
                <p className="text-xs uppercase tracking-wide text-muted">Einheiten</p>
                <p className="mt-1 text-xl font-semibold">{currentWeek?.sessions ?? 0}</p>
              </div>
              <div className="px-4">
                <p className="text-xs uppercase tracking-wide text-muted">Umfang</p>
                <p className="mt-1 text-xl font-semibold text-accent">{currentWeekHours}</p>
              </div>
              <div className="px-4">
                <p className="text-xs uppercase tracking-wide text-muted">Letzte Einheit</p>
                <p className="mt-1 truncate text-base font-semibold">{latestActivity ? activityLabel(latestActivity.activityType) : "–"}</p>
              </div>
            </div>
          </Card>

          <Card title="Leistungsprofil" subtitle="Wird automatisch aus belastbaren Trainingsdaten ermittelt">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">FTP</span>
                <span className="font-medium">{ftpLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Archetyp</span>
                <span className="font-medium">{archetypeLabel}</span>
              </div>
              <div className="pt-2 border-t border-border">
                <span className="text-muted text-xs">Stärken</span>
                <p className="text-sm">{strengthsLabel}</p>
              </div>
              <div>
                <span className="text-muted text-xs">Schwächen</span>
                <p className="text-sm">{limitersLabel}</p>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <Card title="Wochenumfang" subtitle="Trainingsstunden der letzten Wochen" className="lg:col-span-2">
            <VolumeBarChart data={analytics.weekly_volume} />
          </Card>
          <Card title="Intensitätsverteilung" subtitle={`${analytics.hr_zones.total_hours} h in Herzfrequenz-Zonen`}>
            <HrZonesChart zones={analytics.hr_zones.zones} />
          </Card>
        </section>

        <section className="space-y-3">
          <PhotoAnalysis />
          <details className="group rounded-xl border border-border bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="flex items-center gap-2 font-medium"><Calculator size={16} className="text-accent" />Concept2 Pace berechnen</span>
              <ChevronDown size={16} className="text-muted transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-border p-4"><Concept2PaceCalculator /></div>
          </details>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Trainieren & reflektieren</p>
              <h2 className="mt-1 text-xl font-semibold">Letzte Einheiten</h2>
            </div>
            <p className="hidden text-sm text-muted sm:block">Öffne eine Einheit für Analyse, Reflexion und Details.</p>
          </div>
          <TrainingActivityList activities={activities} />
        </section>

    </PageShell>
  );
}
