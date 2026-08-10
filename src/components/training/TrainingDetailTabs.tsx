"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ActivityHrZones } from "@/components/charts/ActivityHrZones";
import { SyncedMultiChart } from "@/components/charts/SyncedMultiChart";
import type { SeriesMetric } from "@/components/charts/ExpandableTimeSeriesChart";
import { LapsTable } from "@/components/training/LapsTable";
import { StrengthLogSection } from "@/components/training/StrengthLogSection";
import { TrainingLogSection } from "@/components/training/TrainingLogSection";
import { ActivitySummaryCard } from "@/components/training/ActivitySummaryCard";
import { ActivityLoadRecoveryTab } from "@/components/training/ActivityLoadRecoveryTab";
import type { Activity, ActivityDetails } from "@/lib/types";

const TABS = ["Übersicht", "Diagramme", "Runden", "Reflexion"] as const;
const CHART_METRICS: SeriesMetric[] = [
  "paceSecondsPerKm", "rowingPaceSecondsPer500", "speedKmh", "heartRate", "power",
  "altitudeM", "cadence", "strokeDistanceM", "temperatureC", "groundContactTimeMs",
  "verticalOscillationCm", "strideLengthM", "verticalRatioPct",
];
type Tab = (typeof TABS)[number];

export function TrainingDetailTabs({ activity }: { activity: Activity }) {
  const [tab, setTab] = useState<Tab>("Übersicht");
  const [details, setDetails] = useState<ActivityDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/training/${activity.activityId}/details`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Details konnten nicht geladen werden (${response.status})`);
        return response.json() as Promise<ActivityDetails>;
      })
      .then(setDetails)
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setDetails(null);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [activity.activityId]);

  const series = details?.series ?? [];
  const chartMetrics = CHART_METRICS.filter((metric) => series.some((point) => point[metric] !== null));
  const dateStr = new Date(activity.startTimeInSeconds * 1000).toISOString().slice(0, 10);
  const isStrength = activity.activityType === "STRENGTH_TRAINING";
  const irrelevantStrengthLabels = ["distanz", "pace", "geschwindigkeit", "schlagrate", "distanz pro zug", "schläge"];
  const overviewMetrics = (details?.overviewMetrics ?? []).filter((item) =>
    !isStrength || !irrelevantStrengthLabels.some((label) => item.label.toLowerCase().includes(label))
  );
  const statistics = (details?.statistics ?? [])
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        !isStrength || !irrelevantStrengthLabels.some((label) => item.label.toLowerCase().includes(label))
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      <div className="flex gap-2 border-b border-border -mt-2 pb-4 overflow-x-auto">
        {TABS.map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`shrink-0 text-sm rounded-full px-4 py-2 border ${tab === item ? "bg-accent-soft text-accent border-accent/50" : "text-muted border-border hover:text-foreground"}`}>
            {item}
          </button>
        ))}
      </div>

      {tab === "Übersicht" && (
        <div className="space-y-6">
          {overviewMetrics.length ? (
            <Card title="Einheit auf einen Blick">
              <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {overviewMetrics.map((item) => (
                  <div key={item.key}>
                    <dt className="text-xs text-muted">{item.label}</dt>
                    <dd className="font-semibold mt-0.5">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ) : loading ? <p className="text-sm text-muted text-center py-4">Grunddaten werden geladen …</p> : null}
          <ActivitySummaryCard activityId={activity.activityId} />
          <ActivityLoadRecoveryTab date={dateStr} />

          {(details?.hrZones || statistics.length > 0) && (
            <details className="group rounded-2xl border border-border bg-surface">
              <summary className="cursor-pointer list-none px-5 py-4 font-medium">
                Alle Messwerte
                <span className="ml-2 text-sm font-normal text-muted group-open:hidden">anzeigen</span>
                <span className="ml-2 hidden text-sm font-normal text-muted group-open:inline">ausblenden</span>
              </summary>
              <div className="space-y-4 border-t border-border p-5">
                {details?.hrZones && (
                  <Card title="Herzfrequenz-Zonen" subtitle={details.hrZonesSource ? `Quelle: ${details.hrZonesSource}` : undefined}>
                    <ActivityHrZones zones={details.hrZones} />
                  </Card>
                )}
                {statistics.map((section) => (
                  <Card key={section.key} title={section.title}>
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                      {section.items.map((item) => <div key={item.key}><dt className="text-xs text-muted">{item.label}</dt><dd className="font-medium mt-0.5">{item.value}</dd></div>)}
                    </dl>
                  </Card>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {tab === "Diagramme" && (chartMetrics.length ? (
        <SyncedMultiChart series={series} metrics={chartMetrics} />
      ) : <p className="text-sm text-muted text-center py-8">{loading ? "Zeitreihen werden geladen …" : "Keine zeitbasierten Messreihen verfügbar."}</p>)}

      {tab === "Runden" && (details?.laps.length ? <LapsTable laps={details.laps} /> : <p className="text-sm text-muted text-center py-8">{loading ? "Runden werden geladen …" : "Keine Runden oder Splits verfügbar."}</p>)}
      {tab === "Reflexion" && (
        <div className="space-y-6">
          <TrainingLogSection activityId={activity.activityId} date={dateStr} imported={details?.importedLog} />
          {activity.activityType === "STRENGTH_TRAINING" && <StrengthLogSection activityId={activity.activityId} date={dateStr} defaultTitle={activity.activityName} />}
        </div>
      )}
    </>
  );
}
