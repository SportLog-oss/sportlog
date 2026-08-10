"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import type { Benchmark, BenchmarkEntry } from "@/lib/types";
import { Check, ChevronDown, ChevronUp, Pencil, Trash2, Trophy, X } from "lucide-react";

function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toFixed(1).padStart(4, "0")}`;
}

function parseClock(input: string): number | null {
  const parts = input.trim().replace(",", ".").split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 1) return parts[0] > 0 ? parts[0] : null;
  if (parts.length === 2 && parts[1] >= 0 && parts[1] < 60) return parts[0] * 60 + parts[1];
  return null;
}

type EditState = { benchmarkId: string; entryIndex: number; date: string; time: string };

export function BenchmarksSection() {
  const [benchmarks, setBenchmarks] = useState<Benchmark[] | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [edit, setEdit] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/benchmarks").then((response) => response.json()).then(setBenchmarks).catch(() => setBenchmarks([]));
  }, []);

  function replaceBenchmark(updated: Benchmark) {
    setBenchmarks((current) => current?.map((benchmark) => benchmark.id === updated.id ? updated : benchmark) ?? []);
  }

  async function saveEdit() {
    if (!edit) return;
    const value = parseClock(edit.time);
    if (!value || !edit.date) {
      setError("Bitte prüfe Datum und Zeit.");
      return;
    }
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/benchmarks/${edit.benchmarkId}/entries`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryIndex: edit.entryIndex, date: edit.date, value }),
    });
    if (response.ok) {
      replaceBenchmark(await response.json());
      setEdit(null);
    } else setError("Die Korrektur konnte nicht gespeichert werden.");
    setBusy(false);
  }

  async function deleteEntry(benchmark: Benchmark, entryIndex: number) {
    if (!window.confirm("Diesen falschen Testeintrag wirklich löschen?")) return;
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/benchmarks/${benchmark.id}/entries`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryIndex }),
    });
    if (response.ok) replaceBenchmark(await response.json());
    else setError("Der Eintrag konnte nicht gelöscht werden.");
    setBusy(false);
  }

  if (benchmarks === null) return null;
  const ergoBenchmarks = benchmarks.filter((benchmark) => benchmark.kind === "time");

  return (
    <Card title="Ergo-Testbestzeiten" subtitle="Automatisch aus deinen erfassten Ergo-Tests – falsche ältere Werte kannst du hier korrigieren">
      {ergoBenchmarks.length === 0 ? <p className="text-sm text-muted">Noch keine Ergo-Tests gespeichert.</p> : <div className="divide-y divide-border">
        {ergoBenchmarks.map((benchmark) => {
          const open = expanded.has(benchmark.id);
          const best = benchmark.entries.length ? Math.min(...benchmark.entries.map((entry) => entry.value)) : null;
          return <div key={benchmark.id}>
            <button onClick={() => setExpanded((current) => {
              const next = new Set(current);
              if (next.has(benchmark.id)) next.delete(benchmark.id); else next.add(benchmark.id);
              return next;
            })} className="flex w-full items-center justify-between gap-3 py-4 text-left">
              <div className="flex items-center gap-3"><Trophy size={17} className="text-accent" /><div><p className="font-medium">{benchmark.name}</p><p className="text-xs text-muted">{benchmark.entries.length} {benchmark.entries.length === 1 ? "Test" : "Tests"}</p></div></div>
              <div className="flex items-center gap-3">{best !== null && <span className="font-semibold text-accent">{formatClock(best)}</span>}{open ? <ChevronUp size={17} className="text-muted" /> : <ChevronDown size={17} className="text-muted" />}</div>
            </button>
            {open && <div className="space-y-2 pb-4">
              {benchmark.entries.map((entry: BenchmarkEntry, entryIndex) => {
                const editing = edit?.benchmarkId === benchmark.id && edit.entryIndex === entryIndex;
                const isBest = entry.value === best;
                return <div key={`${entry.date}-${entryIndex}`} className="flex flex-col gap-2 rounded-lg border border-border bg-surface-raised px-3 py-3 sm:flex-row sm:items-center">
                  {editing ? <>
                    <input type="date" value={edit.date} onChange={(event) => setEdit({ ...edit, date: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                    <input value={edit.time} onChange={(event) => setEdit({ ...edit, time: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                    <div className="ml-auto flex gap-2"><button disabled={busy} onClick={saveEdit} className="rounded-lg bg-accent p-2 text-black" aria-label="Korrektur speichern"><Check size={16} /></button><button onClick={() => setEdit(null)} className="rounded-lg border border-border p-2 text-muted" aria-label="Abbrechen"><X size={16} /></button></div>
                  </> : <>
                    <span className="text-sm text-muted">{new Date(`${entry.date}T12:00:00`).toLocaleDateString("de-DE")}</span>
                    <span className="font-semibold">{formatClock(entry.value)}</span>
                    {isBest && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">Bestzeit</span>}
                    <div className="ml-auto flex gap-1"><button onClick={() => setEdit({ benchmarkId: benchmark.id, entryIndex, date: entry.date, time: formatClock(entry.value) })} className="rounded-lg p-2 text-muted hover:bg-surface hover:text-accent" aria-label="Eintrag bearbeiten"><Pencil size={15} /></button><button disabled={busy} onClick={() => deleteEntry(benchmark, entryIndex)} className="rounded-lg p-2 text-muted hover:bg-negative/10 hover:text-negative" aria-label="Eintrag löschen"><Trash2 size={15} /></button></div>
                  </>}
                </div>;
              })}
            </div>}
          </div>;
        })}
      </div>}
      {error && <p className="mt-3 text-sm text-negative">{error}</p>}
    </Card>
  );
}
