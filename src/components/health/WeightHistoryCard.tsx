"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { TrendChart } from "@/components/charts/TrendChart";
import type { WeightEntry } from "@/lib/types";

export function WeightHistoryCard() {
  const [entries, setEntries] = useState<WeightEntry[] | null>(null);

  useEffect(() => {
    function load() {
      fetch("/api/weight?limit=365")
        .then((response) => {
          if (!response.ok) throw new Error("Gewichtsverlauf konnte nicht geladen werden.");
          return response.json() as Promise<WeightEntry[]>;
        })
        .then(setEntries)
        .catch(() => setEntries([]));
    }

    load();
    window.addEventListener("sportlog:weight-updated", load);
    return () => window.removeEventListener("sportlog:weight-updated", load);
  }, []);

  const chartData = useMemo(
    () => collapseSameDay(entries ?? []).map((entry) => ({ date: entry.measuredOn, weight: entry.weightKg })),
    [entries]
  );

  return (
    <Card title="Gewichtsverlauf" subtitle={latestSubtitle(entries ?? [])}>
      {entries === null ? (
        <p className="py-8 text-center text-sm text-muted">Lädt…</p>
      ) : chartData.length > 0 ? (
        <TrendChart
          data={chartData}
          lines={[{ key: "weight", color: "var(--accent)", name: "Gewicht (kg)" }]}
        />
      ) : (
        <p className="py-8 text-center text-sm text-muted">
          Noch keine Gewichtsmessung. Nutze die Schnellerfassung, um den ersten Wert zu speichern.
        </p>
      )}
    </Card>
  );
}

function collapseSameDay(entries: WeightEntry[]): WeightEntry[] {
  const byDate = new Map<string, WeightEntry>();
  for (const entry of entries) {
    const existing = byDate.get(entry.measuredOn);
    if (!existing || entry.source === "manual" || entry.measuredAt > existing.measuredAt) {
      byDate.set(entry.measuredOn, entry);
    }
  }
  return [...byDate.values()].sort((a, b) => a.measuredOn.localeCompare(b.measuredOn));
}

function latestSubtitle(entries: WeightEntry[]): string | undefined {
  const latest = collapseSameDay(entries).at(-1);
  if (!latest) return undefined;
  return `Aktuell ${latest.weightKg.toLocaleString("de-DE", { maximumFractionDigits: 2 })} kg`;
}
