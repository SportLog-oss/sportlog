import { getActivities } from "@/lib/data/store";
import { Card } from "@/components/ui/Card";
import { ActivityHrZones } from "@/components/charts/ActivityHrZones";
import { StrengthLogSection } from "@/components/training/StrengthLogSection";
import { NotesSection } from "@/components/training/NotesSection";
import { ActivityDetailsSection } from "@/components/training/ActivityDetailsSection";
import { activityLabel, formatActivityPace, formatDate, formatDistance, formatDuration } from "@/lib/format";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Flame, Gauge, HeartPulse, TrendingUp, Zap } from "lucide-react";

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { activities } = await getActivities();
  const activity = activities.find((a) => String(a.activityId) === id);

  if (!activity) notFound();

  const pace = formatActivityPace(activity);

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="border-b border-border px-8 py-5">
        <Link href="/training" className="flex items-center gap-1.5 text-xs text-muted hover:text-accent mb-2">
          <ArrowLeft size={13} /> Zurück zu Training
        </Link>
        <h1 className="text-xl font-semibold">{activity.activityName}</h1>
        <p className="text-sm text-muted mt-0.5">
          {activityLabel(activity.activityType)} · {formatDate(activity.startTimeInSeconds)}
        </p>
      </header>

      <div className="p-8 space-y-6">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="!p-4">
            <div className="flex items-center gap-2 text-xs text-muted mb-1">
              <HeartPulse size={13} /> Herzfrequenz
            </div>
            <p className="text-xl font-semibold">
              {activity.averageHeartRateInBeatsPerMinute ?? "–"} <span className="text-xs text-muted font-normal">Ø bpm</span>
            </p>
            <p className="text-xs text-muted mt-0.5">Max {activity.maxHeartRateInBeatsPerMinute ?? "–"} bpm</p>
          </Card>
          <Card className="!p-4">
            <div className="flex items-center gap-2 text-xs text-muted mb-1">
              <Gauge size={13} /> Dauer / Distanz
            </div>
            <p className="text-xl font-semibold">{formatDuration(activity.durationInSeconds)}</p>
            <p className="text-xs text-muted mt-0.5">{formatDistance(activity.distanceInMeters)}</p>
          </Card>
          <Card className="!p-4">
            <div className="flex items-center gap-2 text-xs text-muted mb-1">
              <TrendingUp size={13} /> Tempo
            </div>
            <p className="text-xl font-semibold">{pace ?? "–"}</p>
            {activity.avgCadence && <p className="text-xs text-muted mt-0.5">Kadenz Ø {activity.avgCadence.toFixed(0)}</p>}
          </Card>
          <Card className="!p-4">
            <div className="flex items-center gap-2 text-xs text-muted mb-1">
              <Flame size={13} /> Kalorien / Belastung
            </div>
            <p className="text-xl font-semibold">{activity.activeKilocalories} kcal</p>
            {activity.trainingLoad !== undefined && (
              <p className="text-xs text-muted mt-0.5">Load {activity.trainingLoad.toFixed(0)}</p>
            )}
          </Card>
        </section>

        {activity.hrZones && (
          <Card title="Herzfrequenz-Zonen">
            <ActivityHrZones zones={activity.hrZones} />
          </Card>
        )}

        {(activity.intensityFactor || activity.efficiencyFactor || activity.avgPower) && (
          <Card title="Leistungskennzahlen">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {activity.avgPower !== undefined && (
                <div>
                  <span className="text-xs text-muted flex items-center gap-1"><Zap size={12} /> Ø Leistung</span>
                  <span className="font-medium">{activity.avgPower} W</span>
                </div>
              )}
              {activity.normalizedPower !== undefined && (
                <div>
                  <span className="text-xs text-muted">Normalisierte Leistung</span>
                  <span className="font-medium block">{activity.normalizedPower} W</span>
                </div>
              )}
              {activity.intensityFactor !== undefined && (
                <div>
                  <span className="text-xs text-muted">Intensitätsfaktor</span>
                  <span className="font-medium block">{activity.intensityFactor.toFixed(2)}</span>
                </div>
              )}
              {activity.efficiencyFactor !== undefined && (
                <div>
                  <span className="text-xs text-muted">Effizienzfaktor</span>
                  <span className="font-medium block">{activity.efficiencyFactor.toFixed(2)}</span>
                </div>
              )}
            </div>
          </Card>
        )}

        <ActivityDetailsSection activityId={activity.activityId} />

        {activity.activityType === "STRENGTH_TRAINING" && (
          <StrengthLogSection
            activityId={activity.activityId}
            date={new Date(activity.startTimeInSeconds * 1000).toISOString().slice(0, 10)}
            defaultTitle={activity.activityName}
          />
        )}

        <NotesSection activityId={activity.activityId} />
      </div>
    </div>
  );
}
