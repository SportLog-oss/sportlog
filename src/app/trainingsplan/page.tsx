"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { TrendChart } from "@/components/charts/TrendChart";
import type { Benchmark, CompetitionResult, PlannedSession, StrengthSession, StrengthExerciseLog } from "@/lib/types";
import { Plus, Trash2, CalendarRange, Dumbbell, LineChart, Trophy, ChevronDown, ChevronUp } from "lucide-react";

const emptyPlanForm = { date: "", title: "", sportType: "", notes: "" };
const BENCHMARK_PRESETS = [
  { name: "Ergo 1500m", kind: "time" as const, unit: "s", lowerIsBetter: true },
  { name: "Ergo 2000m", kind: "time" as const, unit: "s", lowerIsBetter: true },
  { name: "30m Sprint", kind: "time" as const, unit: "s", lowerIsBetter: true },
  { name: "Kniebeuge 1RM", kind: "weight" as const, unit: "kg", lowerIsBetter: false },
  { name: "Bankdrücken 1RM", kind: "weight" as const, unit: "kg", lowerIsBetter: false },
  { name: "Kreuzheben 1RM", kind: "weight" as const, unit: "kg", lowerIsBetter: false },
];

export default function TrainingsplanPage() {
  const [sessions, setSessions] = useState<PlannedSession[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionResult[]>([]);
  const [strengthSessions, setStrengthSessions] = useState<StrengthSession[]>([]);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState(emptyPlanForm);

  const [showStrengthForm, setShowStrengthForm] = useState(false);
  const [strengthTitle, setStrengthTitle] = useState("Krafttraining");
  const [strengthDate, setStrengthDate] = useState("");
  const [exercises, setExercises] = useState<StrengthExerciseLog[]>([{ name: "", sets: [{ weightKg: null, reps: null }] }]);

  const [showBenchForm, setShowBenchForm] = useState(false);
  const [benchName, setBenchName] = useState("");
  const [benchUnit, setBenchUnit] = useState("s");
  const [expandedBench, setExpandedBench] = useState<string | null>(null);
  const [entryForms, setEntryForms] = useState<Record<string, { date: string; value: string }>>({});

  useEffect(() => {
    fetch("/api/planned-sessions").then((r) => r.json()).then(setSessions);
    fetch("/api/competitions").then((r) => r.json()).then(setCompetitions);
    fetch("/api/strength").then((r) => r.json()).then(setStrengthSessions);
    fetch("/api/benchmarks").then((r) => r.json()).then(setBenchmarks);
  }, []);

  async function addPlan(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/planned-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(planForm),
    });
    const created = await res.json();
    setSessions((s) => [...s, created]);
    setShowPlanForm(false);
    setPlanForm(emptyPlanForm);
  }

  async function deletePlan(id: string) {
    await fetch("/api/planned-sessions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setSessions((s) => s.filter((x) => x.id !== id));
  }

  function updateExercise(i: number, name: string) {
    setExercises((ex) => ex.map((e, idx) => (idx === i ? { ...e, name } : e)));
  }
  function updateSet(exIdx: number, setIdx: number, field: "weightKg" | "reps", value: string) {
    setExercises((ex) =>
      ex.map((e, i) =>
        i === exIdx
          ? { ...e, sets: e.sets.map((s, si) => (si === setIdx ? { ...s, [field]: value ? Number(value) : null } : s)) }
          : e
      )
    );
  }
  function addSet(exIdx: number) {
    setExercises((ex) => ex.map((e, i) => (i === exIdx ? { ...e, sets: [...e.sets, { weightKg: null, reps: null }] } : e)));
  }
  function addExercise() {
    setExercises((ex) => [...ex, { name: "", sets: [{ weightKg: null, reps: null }] }]);
  }
  function removeExercise(i: number) {
    setExercises((ex) => ex.filter((_, idx) => idx !== i));
  }

  async function submitStrength() {
    const res = await fetch("/api/strength", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: strengthDate, title: strengthTitle, exercises: exercises.filter((e) => e.name) }),
    });
    const created = await res.json();
    setStrengthSessions((s) => [created, ...s]);
    setShowStrengthForm(false);
    setExercises([{ name: "", sets: [{ weightKg: null, reps: null }] }]);
    setStrengthDate("");
  }

  async function deleteStrength(id: string) {
    await fetch("/api/strength", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setStrengthSessions((s) => s.filter((x) => x.id !== id));
  }

  async function addBenchmark(preset?: (typeof BENCHMARK_PRESETS)[number]) {
    const body = preset
      ? { name: preset.name, kind: preset.kind, unit: preset.unit, lowerIsBetter: preset.lowerIsBetter }
      : { name: benchName, kind: "time", unit: benchUnit, lowerIsBetter: true };
    const res = await fetch("/api/benchmarks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const created = await res.json();
    setBenchmarks((b) => [...b, created]);
    setShowBenchForm(false);
    setBenchName("");
  }

  async function deleteBenchmark(id: string) {
    await fetch("/api/benchmarks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setBenchmarks((b) => b.filter((x) => x.id !== id));
  }

  async function addEntry(id: string) {
    const form = entryForms[id];
    if (!form?.value) return;
    const res = await fetch(`/api/benchmarks/${id}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: form.date || new Date().toISOString().slice(0, 10), value: form.value }),
    });
    const updated = await res.json();
    setBenchmarks((b) => b.map((x) => (x.id === id ? updated : x)));
    setEntryForms((f) => ({ ...f, [id]: { date: "", value: "" } }));
  }

  const upcoming = [
    ...sessions.filter((s) => !s.done).map((s) => ({ kind: "session" as const, date: s.date, item: s })),
    ...competitions.filter((c) => c.status === "planned").map((c) => ({ kind: "competition" as const, date: c.date, item: c })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="border-b border-border px-8 py-5">
        <h1 className="text-xl font-semibold">Trainingsplan</h1>
        <p className="text-sm text-muted mt-0.5">Planen, Krafttraining protokollieren, Bestwerte verfolgen</p>
      </header>

      <div className="p-8 space-y-10">
        {/* Plan section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide flex items-center gap-1.5">
              <CalendarRange size={14} /> Geplante Einheiten &amp; Wettkämpfe
            </h2>
            <button onClick={() => setShowPlanForm((s) => !s)} className="flex items-center gap-1.5 text-sm font-medium bg-accent text-black rounded-lg px-3 py-1.5 hover:opacity-90">
              <Plus size={14} /> Einheit planen
            </button>
          </div>

          {showPlanForm && (
            <Card>
              <form onSubmit={addPlan} className="grid md:grid-cols-2 gap-3">
                <input required type="date" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm" value={planForm.date} onChange={(e) => setPlanForm({ ...planForm, date: e.target.value })} />
                <input required placeholder="Titel (z.B. Langer Ruderausflug)" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm" value={planForm.title} onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })} />
                <input placeholder="Sportart" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm" value={planForm.sportType} onChange={(e) => setPlanForm({ ...planForm, sportType: e.target.value })} />
                <input placeholder="Notizen" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm" value={planForm.notes} onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })} />
                <button className="md:col-span-2 bg-accent text-black rounded-lg px-3 py-2 text-sm font-medium">Speichern</button>
              </form>
            </Card>
          )}

          <div className="space-y-2">
            {upcoming.length === 0 && <p className="text-sm text-muted">Keine geplanten Einheiten oder Wettkämpfe.</p>}
            {upcoming.map(({ kind, date, item }) => (
              <div key={kind + item.id} className="rounded-xl border border-border bg-surface px-4 py-3 flex items-center gap-3">
                {kind === "competition" ? <Trophy size={16} className="text-accent shrink-0" /> : <CalendarRange size={16} className="text-accent shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{kind === "competition" ? (item as CompetitionResult).name : (item as PlannedSession).title}</p>
                  <p className="text-xs text-muted">{date}{kind === "session" ? ` · ${(item as PlannedSession).sportType}` : " · Wettkampf"}</p>
                </div>
                {kind === "session" && (
                  <button onClick={() => deletePlan(item.id)} className="text-muted hover:text-negative shrink-0">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Strength logging */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide flex items-center gap-1.5">
              <Dumbbell size={14} /> Krafttraining protokollieren
            </h2>
            <button onClick={() => setShowStrengthForm((s) => !s)} className="flex items-center gap-1.5 text-sm font-medium bg-accent text-black rounded-lg px-3 py-1.5 hover:opacity-90">
              <Plus size={14} /> Session loggen
            </button>
          </div>

          {showStrengthForm && (
            <Card>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <input placeholder="Titel" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm" value={strengthTitle} onChange={(e) => setStrengthTitle(e.target.value)} />
                  <input required type="date" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm" value={strengthDate} onChange={(e) => setStrengthDate(e.target.value)} />
                </div>

                {exercises.map((ex, exIdx) => (
                  <div key={exIdx} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input placeholder="Übung (z.B. Kniebeuge)" className="flex-1 bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm" value={ex.name} onChange={(e) => updateExercise(exIdx, e.target.value)} />
                      <button onClick={() => removeExercise(exIdx)} className="text-muted hover:text-negative">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {ex.sets.map((s, setIdx) => (
                        <div key={setIdx} className="flex items-center gap-2">
                          <span className="text-xs text-muted w-12">Satz {setIdx + 1}</span>
                          <input placeholder="kg" type="number" className="w-20 bg-surface-raised border border-border rounded-lg px-2 py-1.5 text-sm" value={s.weightKg ?? ""} onChange={(e) => updateSet(exIdx, setIdx, "weightKg", e.target.value)} />
                          <input placeholder="Wdh." type="number" className="w-20 bg-surface-raised border border-border rounded-lg px-2 py-1.5 text-sm" value={s.reps ?? ""} onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value)} />
                        </div>
                      ))}
                      <button onClick={() => addSet(exIdx)} className="text-xs text-accent hover:underline">+ Satz hinzufügen</button>
                    </div>
                  </div>
                ))}
                <button onClick={addExercise} className="text-sm text-accent hover:underline">+ Übung hinzufügen</button>

                <button onClick={submitStrength} className="bg-accent text-black rounded-lg px-3 py-2 text-sm font-medium">
                  Session speichern
                </button>
              </div>
            </Card>
          )}

          <div className="space-y-2">
            {strengthSessions.length === 0 && <p className="text-sm text-muted">Noch keine Kraftsessions protokolliert.</p>}
            {strengthSessions.map((s) => (
              <Card key={s.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold">{s.title}</p>
                    <p className="text-xs text-muted">{s.date}</p>
                  </div>
                  <button onClick={() => deleteStrength(s.id)} className="text-muted hover:text-negative">
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="mt-3 space-y-1.5">
                  {s.exercises.map((ex, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium">{ex.name}</span>{" "}
                      <span className="text-muted">
                        {ex.sets.map((set, si) => `${set.weightKg ?? "–"}kg × ${set.reps ?? "–"}`).join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Benchmarks */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide flex items-center gap-1.5">
              <LineChart size={14} /> Bestwerte &amp; Testkurven
            </h2>
            <button onClick={() => setShowBenchForm((s) => !s)} className="flex items-center gap-1.5 text-sm font-medium bg-accent text-black rounded-lg px-3 py-1.5 hover:opacity-90">
              <Plus size={14} /> Bestwert anlegen
            </button>
          </div>

          {showBenchForm && (
            <Card>
              <div className="space-y-3">
                <p className="text-xs text-muted uppercase">Vorlagen</p>
                <div className="flex flex-wrap gap-2">
                  {BENCHMARK_PRESETS.map((p) => (
                    <button key={p.name} onClick={() => addBenchmark(p)} className="text-xs bg-surface-raised border border-border rounded-full px-3 py-1.5 hover:border-accent/50">
                      {p.name}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted uppercase pt-2">Oder eigener Wert</p>
                <div className="flex gap-2">
                  <input placeholder="Name" className="flex-1 bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm" value={benchName} onChange={(e) => setBenchName(e.target.value)} />
                  <input placeholder="Einheit" className="w-24 bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm" value={benchUnit} onChange={(e) => setBenchUnit(e.target.value)} />
                  <button onClick={() => addBenchmark()} className="bg-accent text-black rounded-lg px-3 py-2 text-sm font-medium">Anlegen</button>
                </div>
              </div>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {benchmarks.length === 0 && <p className="text-sm text-muted">Noch keine Bestwerte angelegt.</p>}
            {benchmarks.map((b) => {
              const expanded = expandedBench === b.id;
              return (
                <Card key={b.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">{b.name}</p>
                      <p className="text-xs text-muted">{b.entries.length} Einträge{b.entries.length > 0 ? ` · zuletzt ${b.entries[b.entries.length - 1].value}${b.unit}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setExpandedBench(expanded ? null : b.id)} className="text-muted">
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <button onClick={() => deleteBenchmark(b.id)} className="text-muted hover:text-negative">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {b.entries.length >= 2 && (
                    <div className="mt-3">
                      <TrendChart
                        data={b.entries.map((e) => ({ date: e.date, value: e.value }))}
                        lines={[{ key: "value", color: "var(--accent)", name: b.name }]}
                      />
                    </div>
                  )}

                  {expanded && (
                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                      <input type="date" className="bg-surface-raised border border-border rounded-lg px-2 py-1.5 text-sm" value={entryForms[b.id]?.date ?? ""} onChange={(e) => setEntryForms((f) => ({ ...f, [b.id]: { date: e.target.value, value: f[b.id]?.value ?? "" } }))} />
                      <input placeholder={`Wert (${b.unit})`} type="number" step="any" className="flex-1 bg-surface-raised border border-border rounded-lg px-2 py-1.5 text-sm" value={entryForms[b.id]?.value ?? ""} onChange={(e) => setEntryForms((f) => ({ ...f, [b.id]: { date: f[b.id]?.date ?? "", value: e.target.value } }))} />
                      <button onClick={() => addEntry(b.id)} className="bg-accent text-black rounded-lg px-3 py-1.5 text-sm font-medium">Eintragen</button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
