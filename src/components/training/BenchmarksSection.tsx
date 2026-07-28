"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { TrendChart } from "@/components/charts/TrendChart";
import type { Benchmark } from "@/lib/types";
import { ChevronDown, ChevronUp, Trophy } from "lucide-react";

const ERGO_PRESETS = [
  "350m Sprint",
  "1000m Dorfregatten",
  "1500m B-Junior Distance",
  "2000m normale Distance",
  "6000m Langstrecke",
];

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseClockToSeconds(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const [m, s] = trimmed.split(":").map(Number);
    if (Number.isNaN(m) || Number.isNaN(s)) return null;
    return m * 60 + s;
  }
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : n;
}

export function BenchmarksSection() {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [forms, setForms] = useState<Record<string, { date: string; time: string }>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/benchmarks")
      .then((r) => r.json())
      .then((b) => {
        setBenchmarks(b);
        setLoaded(true);
      });
  }, []);

  function toggleExpanded(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function submitEntry(name: string) {
    const form = forms[name];
    const value = form ? parseClockToSeconds(form.time) : null;
    if (value == null) return;
    const date = form?.date || new Date().toISOString().slice(0, 10);
    const existing = benchmarks.find((b) => b.name === name);

    if (existing) {
      const updated = await fetch(`/api/benchmarks/${existing.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, value }),
      }).then((r) => r.json());
      setBenchmarks((bs) => bs.map((b) => (b.id === existing.id ? updated : b)));
    } else {
      const created = await fetch("/api/benchmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, kind: "time", unit: "s", lowerIsBetter: true, firstValue: value, firstDate: date }),
      }).then((r) => r.json());
      setBenchmarks((bs) => [...bs, created]);
    }
    setForms((f) => ({ ...f, [name]: { date: "", time: "" } }));
  }

  if (!loaded) return null;

  return (
    <Card title="Bestwerte & Testkurven" subtitle="Ergo-Distanzen — Zeit eintragen und Verlauf verfolgen">
      <div className="divide-y divide-border -mx-4 sm:mx-0">
        {ERGO_PRESETS.map((name) => {
          const b = benchmarks.find((x) => x.name === name);
          const best = b && b.entries.length > 0 ? Math.min(...b.entries.map((e) => e.value)) : null;
          const form = forms[name] ?? { date: "", time: "" };
          const isOpen = expanded.has(name);

          return (
            <div key={name}>
              <button
                onClick={() => toggleExpanded(name)}
                className="w-full flex items-center justify-between gap-3 px-4 sm:px-0 py-3 text-left hover:bg-surface-raised/50 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Trophy size={15} className="text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <p className="text-xs text-muted">
                      {best != null ? `Bestzeit ${formatClock(best)} · ${b!.entries.length} Einträge` : "Noch keine Einträge"}
                    </p>
                  </div>
                </div>
                {isOpen ? <ChevronUp size={16} className="text-muted shrink-0" /> : <ChevronDown size={16} className="text-muted shrink-0" />}
              </button>

              {isOpen && (
                <div className="px-4 sm:px-0 pb-4 space-y-3">
                  {b && b.entries.length >= 2 && (
                    <TrendChart
                      data={b.entries.map((e) => ({ date: e.date, value: e.value }))}
                      lines={[{ key: "value", color: "var(--accent)", name }]}
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      className="bg-surface-raised border border-border rounded-lg px-2 py-1.5 text-sm"
                      value={form.date}
                      onChange={(e) => setForms((f) => ({ ...f, [name]: { ...form, date: e.target.value } }))}
                    />
                    <input
                      placeholder="m:ss"
                      className="flex-1 bg-surface-raised border border-border rounded-lg px-2 py-1.5 text-sm"
                      value={form.time}
                      onChange={(e) => setForms((f) => ({ ...f, [name]: { ...form, time: e.target.value } }))}
                      onKeyDown={(e) => e.key === "Enter" && submitEntry(name)}
                    />
                    <button
                      onClick={() => submitEntry(name)}
                      className="bg-accent text-black rounded-lg px-3 py-1.5 text-sm font-medium shrink-0"
                    >
                      Eintragen
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
