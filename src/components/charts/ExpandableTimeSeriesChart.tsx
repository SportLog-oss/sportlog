"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Brush } from "recharts";
import { Maximize2, X } from "lucide-react";
import type { ActivitySeriesPoint } from "@/lib/types";

export type SeriesMetric =
  | "heartRate"
  | "speedKmh"
  | "altitudeM"
  | "cadence"
  | "power"
  | "paceSecondsPerKm"
  | "rowingPaceSecondsPer500"
  | "strokeDistanceM"
  | "temperatureC"
  | "groundContactTimeMs"
  | "verticalOscillationCm"
  | "strideLengthM"
  | "verticalRatioPct";

export const METRIC_META: Record<SeriesMetric, { label: string; unit: string; color: string; decimals: number }> = {
  heartRate: { label: "Herzfrequenz", unit: "bpm", color: "#f87171", decimals: 0 },
  speedKmh: { label: "Geschwindigkeit", unit: "km/h", color: "#2dd4bf", decimals: 1 },
  altitudeM: { label: "Höhe", unit: "m", color: "#34d399", decimals: 0 },
  cadence: { label: "Kadenz/Zugzahl", unit: "/min", color: "#fbbf24", decimals: 0 },
  power: { label: "Leistung", unit: "W", color: "#2dd4bf", decimals: 0 },
  paceSecondsPerKm: { label: "Pace", unit: "min/km", color: "#60a5fa", decimals: 0 },
  rowingPaceSecondsPer500: { label: "500-m-Split", unit: "/500 m", color: "#818cf8", decimals: 0 },
  strokeDistanceM: { label: "Distanz pro Zug", unit: "m", color: "#a78bfa", decimals: 2 },
  temperatureC: { label: "Temperatur", unit: "°C", color: "#fb923c", decimals: 1 },
  groundContactTimeMs: { label: "Bodenkontaktzeit", unit: "ms", color: "#f472b6", decimals: 0 },
  verticalOscillationCm: { label: "Vertikale Bewegung", unit: "cm", color: "#c084fc", decimals: 1 },
  strideLengthM: { label: "Schrittlänge", unit: "m", color: "#22d3ee", decimals: 2 },
  verticalRatioPct: { label: "Vertikales Verhältnis", unit: "%", color: "#facc15", decimals: 1 },
};

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ExpandableTimeSeriesChart({
  series,
  metrics,
  title,
}: {
  series: ActivitySeriesPoint[];
  metrics: SeriesMetric[];
  title?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [metric, setMetric] = useState<SeriesMetric>(metrics[0]);
  const meta = METRIC_META[metric];

  if (series.length === 0) return null;
  const hasData = series.some((p) => p[metric] !== null);
  const data = series.map((p) => ({ label: formatElapsed(p.t), value: p[metric] }));

  return (
    <>
      <button
        onClick={() => setExpanded(true)}
        className="w-full text-left rounded-xl border border-border bg-surface p-4 hover:border-accent/40 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">{title ?? meta.label}</span>
          <Maximize2 size={14} className="text-muted" />
        </div>
        {hasData ? (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <XAxis dataKey="label" hide />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
              <Line type="monotone" dataKey="value" stroke={meta.color} strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted py-8 text-center">Keine Daten für {meta.label}.</p>
        )}
      </button>

      {expanded && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <button onClick={() => setExpanded(false)} className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
              <X size={16} /> Schließen
            </button>
            <span className="text-sm font-semibold">{meta.label}</span>
            <div className="w-20" />
          </div>

          <div className="flex-1 p-6">
            {hasData ? (
              <div className="h-[65vh]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                    <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip
                      contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "var(--muted)" }}
                      formatter={(value) => [`${Number(value).toFixed(meta.decimals)} ${meta.unit}`, meta.label]}
                    />
                    <Line type="monotone" dataKey="value" stroke={meta.color} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                    <Brush dataKey="label" height={28} stroke={meta.color} fill="var(--surface)" travellerWidth={8} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted py-8 text-center">Keine Daten für {meta.label}.</p>
            )}
            <p className="text-xs text-muted text-center mt-2">Ziehe die Griffe unten am Diagramm, um einen Zeitbereich zu zoomen.</p>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border p-4">
            {metrics.map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`text-sm rounded-full px-3 py-1.5 border ${
                  m === metric ? "bg-accent-soft text-accent border-accent/50" : "text-muted border-border hover:text-foreground"
                }`}
              >
                {METRIC_META[m].label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
