"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { LapsTable } from "@/components/training/LapsTable";

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
}

export function ActivityDetailsSection({ activityId }: { activityId: number }) {
  const [data, setData] = useState<ActivityDetails | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/training/${activityId}/details`)
      .then((r) => r.json())
      .then((d: ActivityDetails) => {
        setData(d);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [activityId]);

  if (!loaded || !data?.hasDetails) return null;

  const items: { label: string; value: string }[] = [];
  if (data.trainingEffect != null) items.push({ label: "Trainingswirkung (aerob)", value: data.trainingEffect.toFixed(1) });
  if (data.anaerobicTrainingEffect != null)
    items.push({ label: "Trainingswirkung (anaerob)", value: data.anaerobicTrainingEffect.toFixed(1) });
  if (data.totalAscent != null) items.push({ label: "Höhenmeter (hoch)", value: `${data.totalAscent.toFixed(0)} m` });
  if (data.totalDescent != null) items.push({ label: "Höhenmeter (runter)", value: `${data.totalDescent.toFixed(0)} m` });
  if (data.sweatLossMl != null) items.push({ label: "Geschätzter Schweißverlust", value: `${(data.sweatLossMl / 1000).toFixed(2)} l` });
  if (data.rpe != null) items.push({ label: "Empfundene Anstrengung (RPE)", value: `${data.rpe} / 10` });

  return (
    <>
      <LapsTable laps={data.laps} />
      {items.length > 0 && (
        <Card title="Weitere Garmin-Daten">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {items.map((item) => (
              <div key={item.label}>
                <span className="text-xs text-muted block">{item.label}</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
