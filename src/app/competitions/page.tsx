"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import type { CompetitionResult } from "@/lib/types";
import { Plus, Trash2, Sparkles, Trophy, Loader2, CalendarClock, ClipboardCheck } from "lucide-react";

const emptyPlanForm = { name: "", date: "", location: "", boatClass: "", crew: "", goal: "", distanceMeters: "2000" };
const emptyResultForm = {
  result: "", placement: "", splitsRaw: "", avgHeartRate: "", weather: "", wind: "", notes: "",
};

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<CompetitionResult[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [resultForm, setResultForm] = useState(emptyResultForm);

  useEffect(() => {
    fetch("/api/competitions")
      .then((r) => r.json())
      .then(setCompetitions);
  }, []);

  const planned = competitions
    .filter((c) => c.status === "planned")
    .sort((a, b) => a.date.localeCompare(b.date));
  const completed = competitions
    .filter((c) => c.status === "completed")
    .sort((a, b) => b.date.localeCompare(a.date));

  async function planCompetition(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/competitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...planForm, distanceMeters: Number(planForm.distanceMeters) || 2000, status: "planned" }),
    });
    const created = await res.json();
    setCompetitions((c) => [created, ...c]);
    setShowForm(false);
    setPlanForm(emptyPlanForm);
  }

  async function submitResult(id: string) {
    const splits = resultForm.splitsRaw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [split, time] = l.split(":").map((s) => s.trim());
        return { split, time: time ?? "" };
      });

    const res = await fetch("/api/competitions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        ...resultForm,
        placement: resultForm.placement ? Number(resultForm.placement) : null,
        avgHeartRate: resultForm.avgHeartRate ? Number(resultForm.avgHeartRate) : null,
        splits,
      }),
    });
    const updated = await res.json();
    setCompetitions((c) => c.map((comp) => (comp.id === id ? updated : comp)));
    setLoggingId(null);
    setResultForm(emptyResultForm);
  }

  async function deleteCompetition(id: string) {
    await fetch("/api/competitions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setCompetitions((c) => c.filter((comp) => comp.id !== id));
  }

  async function analyze(id: string) {
    setAnalyzing(id);
    try {
      const res = await fetch(`/api/competitions/${id}/analyze`, { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        setCompetitions((c) => c.map((comp) => (comp.id === id ? updated : comp)));
      } else {
        const err = await res.json();
        alert(err.error ?? "Analyse fehlgeschlagen");
      }
    } finally {
      setAnalyzing(null);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="border-b border-border px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Wettkämpfe</h1>
          <p className="text-sm text-muted mt-0.5">Planen, protokollieren, automatisch analysieren lassen</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 text-sm font-medium bg-accent text-black rounded-lg px-3 py-2 hover:opacity-90"
        >
          <Plus size={16} /> Wettkampf planen
        </button>
      </header>

      <div className="p-8 space-y-8">
        {showForm && (
          <Card title="Neuen Wettkampf planen">
            <form onSubmit={planCompetition} className="grid md:grid-cols-2 gap-3">
              <input required placeholder="Name" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} />
              <input required type="date" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={planForm.date} onChange={(e) => setPlanForm({ ...planForm, date: e.target.value })} />
              <input placeholder="Ort" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={planForm.location} onChange={(e) => setPlanForm({ ...planForm, location: e.target.value })} />
              <input placeholder="Strecke (m)" type="number" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={planForm.distanceMeters} onChange={(e) => setPlanForm({ ...planForm, distanceMeters: e.target.value })} />
              <input placeholder="Bootsklasse (z.B. 1x, 4-, 8+)" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={planForm.boatClass} onChange={(e) => setPlanForm({ ...planForm, boatClass: e.target.value })} />
              <input placeholder="Mannschaft" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={planForm.crew} onChange={(e) => setPlanForm({ ...planForm, crew: e.target.value })} />
              <input placeholder="Ziel (z.B. unter 6:50, Top 3)" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm md:col-span-2"
                value={planForm.goal} onChange={(e) => setPlanForm({ ...planForm, goal: e.target.value })} />
              <button className="md:col-span-2 bg-accent text-black rounded-lg px-3 py-2 text-sm font-medium">
                Speichern
              </button>
            </form>
          </Card>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide flex items-center gap-1.5">
            <CalendarClock size={14} /> Anstehende Wettkämpfe
          </h2>
          {planned.length === 0 && <p className="text-sm text-muted">Keine geplanten Wettkämpfe.</p>}
          {planned.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-accent" />
                  <div>
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-xs text-muted">
                      {c.date} &middot; {c.location} &middot; {c.boatClass}
                    </p>
                    {c.goal && <p className="text-xs text-muted mt-0.5">Ziel: {c.goal}</p>}
                  </div>
                </div>
                <button onClick={() => deleteCompetition(c.id)} className="text-muted hover:text-negative">
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                {loggingId === c.id ? (
                  <div className="grid md:grid-cols-2 gap-3">
                    <input placeholder="Ergebnis (Zeit)" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                      value={resultForm.result} onChange={(e) => setResultForm({ ...resultForm, result: e.target.value })} />
                    <input placeholder="Platzierung" type="number" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                      value={resultForm.placement} onChange={(e) => setResultForm({ ...resultForm, placement: e.target.value })} />
                    <input placeholder="Ø Herzfrequenz" type="number" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                      value={resultForm.avgHeartRate} onChange={(e) => setResultForm({ ...resultForm, avgHeartRate: e.target.value })} />
                    <input placeholder="Wetter" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                      value={resultForm.weather} onChange={(e) => setResultForm({ ...resultForm, weather: e.target.value })} />
                    <input placeholder="Wind" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                      value={resultForm.wind} onChange={(e) => setResultForm({ ...resultForm, wind: e.target.value })} />
                    <textarea placeholder={"Splitzeiten, eine pro Zeile: 500m: 1:45.2"} className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm md:col-span-2"
                      value={resultForm.splitsRaw} onChange={(e) => setResultForm({ ...resultForm, splitsRaw: e.target.value })} />
                    <textarea placeholder="Notizen" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm md:col-span-2"
                      value={resultForm.notes} onChange={(e) => setResultForm({ ...resultForm, notes: e.target.value })} />
                    <div className="md:col-span-2 flex gap-2">
                      <button onClick={() => submitResult(c.id)} className="bg-accent text-black rounded-lg px-3 py-2 text-sm font-medium">
                        Ergebnis speichern
                      </button>
                      <button onClick={() => setLoggingId(null)} className="text-sm text-muted px-3 py-2">
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setLoggingId(c.id); setResultForm(emptyResultForm); }}
                    className="flex items-center gap-1.5 text-sm text-accent hover:underline"
                  >
                    <ClipboardCheck size={14} /> Ergebnis eintragen
                  </button>
                )}
              </div>
            </Card>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide flex items-center gap-1.5">
            <Trophy size={14} /> Vergangene Wettkämpfe
          </h2>
          {completed.length === 0 && <p className="text-sm text-muted">Noch keine abgeschlossenen Wettkämpfe.</p>}
          {completed.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-accent" />
                  <div>
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-xs text-muted">
                      {c.date} &middot; {c.location} &middot; {c.boatClass}
                    </p>
                  </div>
                </div>
                <button onClick={() => deleteCompetition(c.id)} className="text-muted hover:text-negative">
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 mt-3 text-sm">
                <div><span className="text-muted text-xs block">Ergebnis</span>{c.result || "–"}</div>
                <div><span className="text-muted text-xs block">Platzierung</span>{c.placement ?? "–"}</div>
                <div><span className="text-muted text-xs block">Ø Herzfrequenz</span>{c.avgHeartRate ?? "–"}</div>
              </div>

              {c.splits.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.splits.map((s, i) => (
                    <span key={i} className="text-xs bg-surface-raised rounded-full px-2.5 py-1">
                      {s.split}: {s.time}
                    </span>
                  ))}
                </div>
              )}

              {c.notes && <p className="text-sm text-muted mt-3">{c.notes}</p>}

              <div className="mt-4 pt-4 border-t border-border">
                {c.analysis ? (
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{c.analysis}</div>
                ) : (
                  <button
                    onClick={() => analyze(c.id)}
                    disabled={analyzing === c.id}
                    className="flex items-center gap-1.5 text-sm text-accent hover:underline disabled:opacity-50"
                  >
                    {analyzing === c.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    KI-Analyse erstellen
                  </button>
                )}
              </div>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}
