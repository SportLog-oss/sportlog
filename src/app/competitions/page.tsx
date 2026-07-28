"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import type { CompetitionResult } from "@/lib/types";
import { Plus, Trash2, Sparkles, Trophy, Loader2 } from "lucide-react";

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<CompetitionResult[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    date: "",
    location: "",
    distanceMeters: "2000",
    boatClass: "",
    crew: "",
    result: "",
    placement: "",
    splitsRaw: "",
    avgHeartRate: "",
    weather: "",
    wind: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/competitions")
      .then((r) => r.json())
      .then(setCompetitions);
  }, []);

  async function addCompetition(e: React.FormEvent) {
    e.preventDefault();
    const splits = form.splitsRaw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [split, time] = l.split(":").map((s) => s.trim());
        return { split, time: time ?? "" };
      });

    const res = await fetch("/api/competitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        distanceMeters: Number(form.distanceMeters) || 2000,
        placement: form.placement ? Number(form.placement) : null,
        avgHeartRate: form.avgHeartRate ? Number(form.avgHeartRate) : null,
        splits,
      }),
    });
    const created = await res.json();
    setCompetitions((c) => [created, ...c]);
    setShowForm(false);
    setForm({
      name: "", date: "", location: "", distanceMeters: "2000", boatClass: "", crew: "",
      result: "", placement: "", splitsRaw: "", avgHeartRate: "", weather: "", wind: "", notes: "",
    });
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
          <p className="text-sm text-muted mt-0.5">Rennen dokumentieren und automatisch analysieren lassen</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 text-sm font-medium bg-accent text-black rounded-lg px-3 py-2 hover:opacity-90"
        >
          <Plus size={16} /> Wettkampf erfassen
        </button>
      </header>

      <div className="p-8 space-y-6">
        {showForm && (
          <Card title="Neuen Wettkampf erfassen">
            <form onSubmit={addCompetition} className="grid md:grid-cols-2 gap-3">
              <input required placeholder="Name" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input required type="date" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              <input placeholder="Ort" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <input placeholder="Strecke (m)" type="number" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={form.distanceMeters} onChange={(e) => setForm({ ...form, distanceMeters: e.target.value })} />
              <input placeholder="Bootsklasse (z.B. 1x, 4-, 8+)" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={form.boatClass} onChange={(e) => setForm({ ...form, boatClass: e.target.value })} />
              <input placeholder="Mannschaft" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={form.crew} onChange={(e) => setForm({ ...form, crew: e.target.value })} />
              <input placeholder="Ergebnis (Zeit)" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} />
              <input placeholder="Platzierung" type="number" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })} />
              <input placeholder="Ø Herzfrequenz" type="number" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={form.avgHeartRate} onChange={(e) => setForm({ ...form, avgHeartRate: e.target.value })} />
              <input placeholder="Wetter" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={form.weather} onChange={(e) => setForm({ ...form, weather: e.target.value })} />
              <input placeholder="Wind" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm md:col-span-1"
                value={form.wind} onChange={(e) => setForm({ ...form, wind: e.target.value })} />
              <textarea placeholder={"Splitzeiten, eine pro Zeile: 500m: 1:45.2"} className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm md:col-span-2"
                value={form.splitsRaw} onChange={(e) => setForm({ ...form, splitsRaw: e.target.value })} />
              <textarea placeholder="Notizen" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm md:col-span-2"
                value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <button className="md:col-span-2 bg-accent text-black rounded-lg px-3 py-2 text-sm font-medium">
                Speichern
              </button>
            </form>
          </Card>
        )}

        <div className="space-y-4">
          {competitions.length === 0 && (
            <p className="text-sm text-muted">Noch keine Wettkämpfe erfasst. Lege den ersten über &quot;Wettkampf erfassen&quot; an.</p>
          )}
          {competitions.map((c) => (
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
        </div>
      </div>
    </div>
  );
}
