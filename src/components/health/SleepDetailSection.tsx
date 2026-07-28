"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";

interface SleepDetail {
  hasData: boolean;
  date: string;
  score: number | null;
  scoreQualifier: string | null;
  durationSec: number;
  deepSec: number | null;
  lightSec: number | null;
  remSec: number | null;
  awakeSec: number | null;
  factors: { label: string; value: string }[];
  overnightHrv: number | null;
  overnightHrvHigh: number | null;
}

const STAGE_COLORS: Record<string, string> = {
  Tiefschlaf: "#3b82f6",
  Leichtschlaf: "#60a5fa",
  REM: "#c084fc",
  Wach: "#f87171",
};

function formatMinutes(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export function SleepDetailSection() {
  const [data, setData] = useState<SleepDetail | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/health/sleep-detail")
      .then((r) => r.json())
      .then((d: SleepDetail) => {
        setData(d);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || !data?.hasData) return null;

  const stages = [
    { label: "Tiefschlaf", seconds: data.deepSec },
    { label: "Leichtschlaf", seconds: data.lightSec },
    { label: "REM", seconds: data.remSec },
    { label: "Wach", seconds: data.awakeSec },
  ].filter((s): s is { label: string; seconds: number } => s.seconds !== null);
  const total = stages.reduce((sum, s) => sum + s.seconds, 0);

  return (
    <Card title="Schlafdetails (letzte Nacht)" subtitle={formatDate(data.date)}>
      <div className="flex items-center gap-6 flex-wrap">
        {data.score !== null && (
          <div>
            <p className="text-2xl font-semibold">
              {data.score} <span className="text-sm text-muted font-normal">/ 100</span>
            </p>
            <p className="text-xs text-muted">{data.scoreQualifier}</p>
          </div>
        )}
        <div>
          <p className="text-2xl font-semibold">{formatMinutes(data.durationSec)}</p>
          <p className="text-xs text-muted">Gesamtschlafdauer</p>
        </div>
        {data.overnightHrv !== null && (
          <div>
            <p className="text-2xl font-semibold">{data.overnightHrv} ms</p>
            <p className="text-xs text-muted">Ø HFV über Nacht</p>
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex h-3 rounded-full overflow-hidden bg-surface-raised">
            {stages.map((s) => (
              <div
                key={s.label}
                style={{ width: `${(s.seconds / total) * 100}%`, backgroundColor: STAGE_COLORS[s.label] }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {stages.map((s) => (
              <span key={s.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[s.label] }} />
                {s.label}: {formatMinutes(s.seconds)} ({((s.seconds / total) * 100).toFixed(0)}%)
              </span>
            ))}
          </div>
        </div>
      )}

      {data.factors.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
          {data.factors.map((f) => (
            <div key={f.label} className="rounded-lg border border-border bg-surface-raised px-3 py-2">
              <p className="text-xs text-muted">{f.label}</p>
              <p className="text-sm font-medium">{f.value}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
