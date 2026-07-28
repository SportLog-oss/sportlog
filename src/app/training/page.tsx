import { getActivities, getAnalyticsSummary, getCurves, getPerformanceEstimates } from "@/lib/data/store";
import { Card } from "@/components/ui/Card";
import { VolumeBarChart } from "@/components/charts/VolumeBarChart";
import { HrZonesChart } from "@/components/charts/HrZonesChart";
import { CurveChart } from "@/components/charts/CurveChart";
import { activityLabel, formatDate, formatDistance, formatDuration, formatPace } from "@/lib/format";
import { Bike, Dumbbell, Waves as RowingIcon, Footprints, Activity as ActivityIcon } from "lucide-react";

const ICONS: Record<string, typeof Bike> = {
  CYCLING: Bike,
  STRENGTH_TRAINING: Dumbbell,
  ROWING_V2: RowingIcon,
  INDOOR_ROWING: RowingIcon,
  RUNNING: Footprints,
  WALKING: Footprints,
};

export default async function TrainingPage() {
  const { activities } = await getActivities();
  const analytics = await getAnalyticsSummary();
  const perf = await getPerformanceEstimates();
  const curves = await getCurves();

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="border-b border-border px-8 py-5">
        <h1 className="text-xl font-semibold">Training</h1>
        <p className="text-sm text-muted mt-0.5">Alle Einheiten aus verbundenen Quellen (Garmin, Strava u.a.)</p>
      </header>

      <div className="p-8 space-y-6">
        <section className="grid md:grid-cols-3 gap-6">
          <Card title="Wochenumfang (Stunden)" className="md:col-span-2">
            <VolumeBarChart data={analytics.weekly_volume} />
          </Card>
          <Card title="Leistungsprofil">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">FTP</span>
                <span className="font-medium">{perf.ftp_watts.toFixed(0)} W</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Archetyp</span>
                <span className="font-medium capitalize">{perf.power_profile.archetype.replace("_", " ")}</span>
              </div>
              <div className="pt-2 border-t border-border">
                <span className="text-muted text-xs">Stärken</span>
                <p className="text-sm">{perf.power_profile.strengths.join(", ")}</p>
              </div>
              <div>
                <span className="text-muted text-xs">Schwächen</span>
                <p className="text-sm">{perf.power_profile.limiters.join(", ")}</p>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid md:grid-cols-3 gap-6">
          <Card title="Herzfrequenz-Zonen (Zeitraum)" subtitle={`${analytics.hr_zones.total_hours}h gesamt`}>
            <HrZonesChart zones={analytics.hr_zones.zones} />
          </Card>
          <Card title="Leistungskurve (Rad)" subtitle="Bestwerte der letzten 90 Tage">
            <CurveChart points={curves.power.points} color="var(--accent)" unit="W" />
          </Card>
          <Card title="Pace-Kurve (Lauf)" subtitle="Bestwerte der letzten 90 Tage">
            <CurveChart points={curves.pace.points} color="var(--positive)" unit="s/km" />
          </Card>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
            Letzte Einheiten
          </h2>
          <div className="space-y-2">
            {activities.map((act) => {
              const Icon = ICONS[act.activityType] ?? ActivityIcon;
              const pace = formatPace(act.averagePaceInMinutesPerKilometer);
              return (
                <div
                  key={act.activityId}
                  className="rounded-xl border border-border bg-surface px-4 py-3 flex items-center gap-4"
                >
                  <div className="w-9 h-9 rounded-lg bg-surface-raised flex items-center justify-center text-accent shrink-0">
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{act.activityName}</span>
                      <span className="text-xs text-muted shrink-0">{activityLabel(act.activityType)}</span>
                    </div>
                    <span className="text-xs text-muted">{formatDate(act.startTimeInSeconds)}</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-6 text-sm shrink-0">
                    <span className="text-muted w-16 text-right">{formatDuration(act.durationInSeconds)}</span>
                    <span className="text-muted w-16 text-right">{formatDistance(act.distanceInMeters)}</span>
                    {pace && <span className="text-muted w-20 text-right">{pace}</span>}
                    <span className="text-muted w-20 text-right">
                      {act.averageHeartRateInBeatsPerMinute ? `Ø ${act.averageHeartRateInBeatsPerMinute} bpm` : "–"}
                    </span>
                    <span className="text-muted w-16 text-right">{act.activeKilocalories} kcal</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
