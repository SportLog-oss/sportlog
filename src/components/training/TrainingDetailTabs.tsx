"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ActivityHrZones } from "@/components/charts/ActivityHrZones";
import { ExpandableTimeSeriesChart, type SeriesMetric } from "@/components/charts/ExpandableTimeSeriesChart";
import { LapsTable } from "@/components/training/LapsTable";
import { StrengthLogSection } from "@/components/training/StrengthLogSection";
import { NotesSection } from "@/components/training/NotesSection";
import { TrainingLogSection } from "@/components/training/TrainingLogSection";
import { ActivitySummaryCard } from "@/components/training/ActivitySummaryCard";
import type { Activity, ActivitySeriesPoint } from "@/lib/types";
import { Zap } from "lucide-react";

interface ParsedLap {
  index: number;
  intensity: string;
  trigger: string;
  duration: string;
  distance: string;
  paceOrSpeed: string;
  hrAvg: number | null;
  hrMax: number | null;
  cadenceAvg: number | null;
  cadenceMax: number | null;
  powerW: number | null;
  ascentM: number | null;
  descentM: number | null;
}

interface ActivityDetails {
  hasDetails: boolean;
  trainingEffect: number | null;
  anaerobicTrainingEffect: number | null;
  totalAscent: number | null;
  totalDescent: number | null;
  sweatLossMl: number | null;
  rpe: number | null;
  laps: ParsedLap[];
  series: ActivitySeriesPoint[];
}

const TABS = ["Übersicht", "Herzfrequenz", "Diagramme", "Splits", "Protokoll"] as const;
type Tab = (typeof TABS)[number];

export function TrainingDetailTabs({ activity }: { activity: Activity }) {
  const [tab, setTab] = useState<Tab>("Übersicht");
  const [details, setDetails] = useState<ActivityDetails | null>(null);

  useEffect(() => {
    fetch(`/api/training/${activity.activityId}/details`)
      .then((r) => r.json())
      .then(setDetails)
      .catch(() => setDetails(null));
  }, [activity.activityId]);

  const series = details?.hasDetails ? details.series : [];
  const availableChartMetrics: SeriesMetric[] = (["speedKmh", "altitudeM", "cadence", "power"] as SeriesMetric[]).filter((m) =>
    series.some((p) => p[m] !== null)
  );
  const hasHrSeries = series.some((p) => p.heartRate !== null);
  const dateStr = new Date(activity.startTimeInSeconds * 1000).toISOString().slice(0, 10);

  const detailItems: { label: string; value: string }[] = [];
  if (details?.hasDetails) {
    if (details.trainingEffect != null) detailItems.push({ label: "Trainingswirkung (aerob)", value: details.trainingEffect.toFixed(1) });
    if (details.anaerobicTrainingEffect != null)
      detailItems.push({ label: "Trainingswirkung (anaerob)", value: details.anaerobicTrainingEffect.toFixed(1) });
    if (details.totalAscent != null) detailItems.push({ label: "Höhenmeter (hoch)", value: `${details.totalAscent.toFixed(0)} m` });
    if (details.totalDescent != null) detailItems.push({ label: "Höhenmeter (runter)", value: `${details.totalDescent.toFixed(0)} m` });
    if (details.sweatLossMl != null) detailItems.push({ label: "Geschätzter Schweißverlust", value: `${(details.sweatLossMl / 1000).toFixed(2)} l` });
    if (details.rpe != null) detailItems.push({ label: "Empfundene Anstrengung (RPE)", value: `${details.rpe} / 10` });
  }

  return (
    <>
      <div className="flex gap-2 border-b border-border -mt-2 pb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 text-sm rounded-full px-4 py-2 border ${
              tab === t ? "bg-accent-soft text-accent border-accent/50" : "text-muted border-border hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Übersicht" && (
        <div className="space-y-6">
          <ActivitySummaryCard activityId={activity.activityId} />
          {(activity.intensityFactor !== undefined || activity.efficiencyFactor !== undefined || activity.avgPower !== undefined) && (
            <Card title="Leistungskennzahlen">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {activity.avgPower !== undefined && (
                  <div>
                    <span className="text-xs text-muted flex items-center gap-1">
                      <Zap size={12} /> Ø Leistung
                    </span>
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
          {detailItems.length > 0 && (
            <Card title="Weitere Garmin-Daten">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {detailItems.map((item) => (
                  <div key={item.label}>
                    <span className="text-xs text-muted block">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "Herzfrequenz" && (
        <div className="space-y-6">
          {activity.hrZones && (
            <Card title="Herzfrequenz-Zonen">
              <ActivityHrZones zones={activity.hrZones} />
            </Card>
          )}
          {hasHrSeries ? (
            <ExpandableTimeSeriesChart series={series} metrics={["heartRate"]} title="Herzfrequenz über Zeit" />
          ) : (
            <p className="text-sm text-muted text-center py-8">Kein zeitbasierter Herzfrequenzverlauf für diese Einheit verfügbar.</p>
          )}
        </div>
      )}

      {tab === "Diagramme" &&
        (availableChartMetrics.length > 0 ? (
          <ExpandableTimeSeriesChart series={series} metrics={availableChartMetrics} />
        ) : (
          <p className="text-sm text-muted text-center py-8">Keine zeitbasierten Diagrammdaten für diese Einheit verfügbar.</p>
        ))}

      {tab === "Splits" &&
        (details?.hasDetails && details.laps.length > 0 ? (
          <LapsTable laps={details.laps} />
        ) : (
          <p className="text-sm text-muted text-center py-8">Keine Runden/Splits für diese Einheit verfügbar.</p>
        ))}

      {tab === "Protokoll" && (
        <div className="space-y-6">
          <TrainingLogSection activityId={activity.activityId} date={dateStr} />
          {activity.activityType === "STRENGTH_TRAINING" && (
            <StrengthLogSection activityId={activity.activityId} date={dateStr} defaultTitle={activity.activityName} />
          )}
          <NotesSection activityId={activity.activityId} />
        </div>
      )}
    </>
  );
}
