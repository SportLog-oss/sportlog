"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, ChevronUp, Maximize2, Settings2, X } from "lucide-react";
import type { ActivitySeriesPoint } from "@/lib/types";
import { METRIC_META, type SeriesMetric } from "./ExpandableTimeSeriesChart";

const STORAGE_KEY = "sportlog:activity-chart-settings:v1";
const TOOLTIP_CONTENT_STYLE = {
  background: "var(--surface-raised)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  color: "var(--foreground)",
  fontSize: 12,
  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
};

type AxisMode = "time" | "distance";
type StoredSettings = { order: SeriesMetric[]; hidden: SeriesMetric[]; axisMode: AxisMode };

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    : `${m}:${s.toString().padStart(2, "0")}`;
}

function displayValue(metric: SeriesMetric, value: number): string {
  const meta = METRIC_META[metric];
  if (metric === "paceSecondsPerKm" || metric === "rowingPaceSecondsPer500") {
    return `${formatElapsed(value)} ${meta.unit}`;
  }
  return `${value.toFixed(meta.decimals)} ${meta.unit}`;
}

export function SyncedMultiChart({ series, metrics }: { series: ActivitySeriesPoint[]; metrics: SeriesMetric[] }) {
  const available = useMemo(() => metrics.filter((metric) => series.some((point) => point[metric] !== null)), [metrics, series]);
  const [order, setOrder] = useState<SeriesMetric[]>(available);
  const [hidden, setHidden] = useState<SeriesMetric[]>([]);
  const [axisMode, setAxisMode] = useState<AxisMode>("time");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [overlay, setOverlay] = useState<SeriesMetric[]>(available.slice(0, 2));

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as StoredSettings | null;
      const storedOrder = stored?.order?.filter((metric) => available.includes(metric)) ?? [];
      // Settings are intentionally activity-independent: newly available AthleteData series are
      // appended, while a user's existing order and visibility preferences are retained.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrder([...storedOrder, ...available.filter((metric) => !storedOrder.includes(metric))]);
      setHidden(stored?.hidden?.filter((metric) => available.includes(metric)) ?? []);
      setAxisMode(stored?.axisMode === "distance" ? "distance" : "time");
      setOverlay((current) => current.filter((metric) => available.includes(metric)).concat(
        available.filter((metric) => !current.includes(metric)).slice(0, Math.max(0, 2 - current.length))
      ));
    } catch {
      setOrder(available);
    }
  }, [available]);

  useEffect(() => {
    if (order.length) localStorage.setItem(STORAGE_KEY, JSON.stringify({ order, hidden, axisMode } satisfies StoredSettings));
  }, [axisMode, hidden, order]);

  if (series.length === 0 || available.length === 0) return null;

  const visible = order.filter((metric) => !hidden.includes(metric));
  const canUseDistance = series.some((point) => point.distanceKm !== null);
  const effectiveAxis: AxisMode = axisMode === "distance" && canUseDistance ? "distance" : "time";
  const data = series.map((point) => ({
    ...point,
    axisLabel:
      effectiveAxis === "distance" && point.distanceKm !== null
        ? `${point.distanceKm.toFixed(2)} km`
        : formatElapsed(point.t),
  }));

  const move = (metric: SeriesMetric, direction: -1 | 1) => {
    const index = order.indexOf(metric);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  };

  const toggleOverlay = (metric: SeriesMetric) => {
    setOverlay((current) =>
      current.includes(metric) ? current.filter((item) => item !== metric) : [...current, metric].slice(-3)
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button onClick={() => setAxisMode("time")} className={`text-xs rounded-full border px-3 py-1.5 ${effectiveAxis === "time" ? "border-accent text-accent bg-accent-soft" : "border-border text-muted"}`}>
            Zeit
          </button>
          <button disabled={!canUseDistance} onClick={() => setAxisMode("distance")} className={`text-xs rounded-full border px-3 py-1.5 disabled:opacity-40 ${effectiveAxis === "distance" ? "border-accent text-accent bg-accent-soft" : "border-border text-muted"}`}>
            Distanz
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSettingsOpen((value) => !value)} className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground"><Settings2 size={14} /> Diagramme</button>
          <button onClick={() => setExpanded(true)} className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground"><Maximize2 size={14} /> Overlay</button>
        </div>
      </div>

      {settingsOpen && (
        <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
          {order.map((metric, index) => (
            <div key={metric} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!hidden.includes(metric)} onChange={() => setHidden((current) => current.includes(metric) ? current.filter((item) => item !== metric) : [...current, metric])} aria-label={`${METRIC_META[metric].label} anzeigen`} />
              <span className="flex-1">{METRIC_META[metric].label}</span>
              <button disabled={index === 0} onClick={() => move(metric, -1)} aria-label="Nach oben"><ChevronUp size={15} /></button>
              <button disabled={index === order.length - 1} onClick={() => move(metric, 1)} aria-label="Nach unten"><ChevronDown size={15} /></button>
            </div>
          ))}
        </div>
      )}

      {visible.length ? visible.map((metric, index) => (
        <ChartPanel
          key={metric}
          data={data}
          metric={metric}
          isLast={index === visible.length - 1}
        />
      )) : <p className="text-sm text-muted text-center py-8">Aktiviere mindestens ein Diagramm.</p>}

      {expanded && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <button onClick={() => setExpanded(false)} className="flex items-center gap-1.5 text-sm text-muted"><X size={16} /> Schließen</button>
            <strong className="text-sm">Vergleichsansicht</strong>
            <div className="w-20" />
          </div>
          <div className="flex flex-wrap gap-2 p-4 border-b border-border">
            {available.map((metric) => (
              <button key={metric} onClick={() => toggleOverlay(metric)} className={`text-xs rounded-full border px-3 py-1.5 ${overlay.includes(metric) ? "border-accent text-accent bg-accent-soft" : "border-border text-muted"}`}>
                {METRIC_META[metric].label}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0 p-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} syncId="activity-overlay" margin={{ top: 8, right: 24, bottom: 0, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="axisLabel" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                {overlay.map((metric, index) => (
                  <YAxis key={metric} yAxisId={metric} orientation={index === 0 ? "left" : "right"} hide={index > 1} tick={{ fill: METRIC_META[metric].color, fontSize: 10 }} width={42} />
                ))}
                <Tooltip
                  contentStyle={TOOLTIP_CONTENT_STYLE}
                  labelStyle={{ color: "var(--muted)" }}
                  itemStyle={{ color: "var(--foreground)" }}
                  cursor={{ stroke: "var(--muted)", strokeWidth: 1 }}
                  formatter={(value, name) => [displayValue(name as SeriesMetric, Number(value)), METRIC_META[name as SeriesMetric].label]}
                />
                {overlay.map((metric) => <Line key={metric} yAxisId={metric} type="monotone" dataKey={metric} stroke={METRIC_META[metric].color} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />)}
                <Brush dataKey="axisLabel" height={28} stroke="var(--muted)" fill="var(--surface)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function ChartPanel({ data, metric, isLast }: { data: Array<ActivitySeriesPoint & { axisLabel: string }>; metric: SeriesMetric; isLast: boolean }) {
  const meta = METRIC_META[metric];
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-xs font-semibold text-muted mb-1">{meta.label}</p>
      <ResponsiveContainer width="100%" height={isLast ? 160 : 110}>
        <LineChart data={data} syncId="activity-series" margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="axisLabel" hide={!isLast} tick={{ fill: "var(--muted)", fontSize: 10 }} />
          <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} width={42} />
          <Tooltip
            contentStyle={TOOLTIP_CONTENT_STYLE}
            labelStyle={{ color: "var(--muted)" }}
            itemStyle={{ color: "var(--foreground)" }}
            cursor={{ stroke: "var(--muted)", strokeWidth: 1 }}
            formatter={(value) => [displayValue(metric, Number(value)), meta.label]}
          />
          <Line type="monotone" dataKey={metric} stroke={meta.color} strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
          {isLast && <Brush dataKey="axisLabel" height={25} stroke="var(--muted)" fill="var(--surface)" />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
