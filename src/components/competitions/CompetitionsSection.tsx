"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import type { CompetitionResult } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { Plus, Trash2, Sparkles, Trophy, Loader2, CalendarClock, ClipboardCheck, Pencil, X, Watch, Flag, Waves } from "lucide-react";

type CompetitionWorkoutContext = {
  plannedSessionId: string;
  title: string;
  startedAt: string;
  durationSeconds: number | null;
  distanceMeters: number | null;
  avgHeartRate: number | null;
  source: string;
};

const emptyPlanForm = { name: "", date: "", location: "", boatClass: "", crew: "", goal: "", distanceMeters: "2000" };
const emptyResultForm = {
  result: "", placement: "", splitsRaw: "", avgHeartRate: "", weather: "", wind: "", notes: "",
};
const emptyEditForm = { ...emptyPlanForm, ...emptyResultForm };

function competitionToEditForm(c: CompetitionResult) {
  return {
    name: c.name,
    date: c.date,
    location: c.location,
    boatClass: c.boatClass,
    crew: c.crew,
    goal: c.goal,
    distanceMeters: String(c.distanceMeters ?? 2000),
    result: c.result,
    placement: c.placement !== null ? String(c.placement) : "",
    avgHeartRate: c.avgHeartRate !== null ? String(c.avgHeartRate) : "",
    weather: c.weather,
    wind: c.wind,
    notes: c.notes,
    splitsRaw: c.splits.map((s) => `${s.split}: ${s.time}`).join("\n"),
  };
}

export function CompetitionsSection() {
  const [competitions, setCompetitions] = useState<CompetitionResult[]>([]);
  const [workoutContexts, setWorkoutContexts] = useState<Record<string, CompetitionWorkoutContext>>({});
  const [showForm, setShowForm] = useState(false);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [resultForm, setResultForm] = useState(emptyResultForm);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [resultError, setResultError] = useState("");
  const [savingResult, setSavingResult] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/competitions").then((r) => r.json()),
      fetch("/api/competitions/contexts").then((r) => (r.ok ? r.json() : {})),
    ]).then(([competitionData, contextData]) => {
      setCompetitions(competitionData);
      setWorkoutContexts(contextData);
    });
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

  function parseSplits(raw: string) {
    return raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const separator = l.indexOf(":");
        if (separator === -1) return { split: l, time: "" };
        return { split: l.slice(0, separator).trim(), time: l.slice(separator + 1).trim() };
      });
  }

  async function submitResult(id: string) {
    if (!resultForm.result.trim()) {
      setResultError("Bitte trage die offizielle Rennzeit oder den offiziellen Status ein.");
      return;
    }
    setSavingResult(true);
    setResultError("");
    try {
      const res = await fetch("/api/competitions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          ...resultForm,
          result: resultForm.result.trim(),
          placement: resultForm.placement ? Number(resultForm.placement) : null,
          avgHeartRate: resultForm.avgHeartRate ? Number(resultForm.avgHeartRate) : null,
          splits: parseSplits(resultForm.splitsRaw),
        }),
      });
      if (!res.ok) throw new Error("Das Regatta-Ergebnis konnte nicht gespeichert werden.");
      const updated = await res.json();
      setCompetitions((c) => c.map((comp) => (comp.id === id ? updated : comp)));
      setLoggingId(null);
      setResultForm(emptyResultForm);
    } catch (error) {
      setResultError(error instanceof Error ? error.message : "Das Regatta-Ergebnis konnte nicht gespeichert werden.");
    } finally {
      setSavingResult(false);
    }
  }

  function formatDuration(seconds: number | null) {
    if (!seconds) return "–";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return hours > 0 ? `${hours} h ${minutes} min` : `${minutes}:${String(remainingSeconds).padStart(2, "0")} min`;
  }

  function formatDistance(meters: number | null) {
    if (!meters) return "–";
    return meters >= 1000 ? `${(meters / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 })} km` : `${Math.round(meters)} m`;
  }

  function renderWatchContext(competitionId: string) {
    const context = workoutContexts[competitionId];
    if (!context) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-surface-raised/40 p-4">
          <div className="flex items-start gap-3">
            <Watch size={18} className="mt-0.5 text-muted" />
            <div>
              <p className="text-sm font-medium">Noch keine Uhr-Aktivität zugeordnet</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">Ordne die Aktivität im Trainingsplan der Regatta zu. Das ist der Belastungsnachweis – nicht automatisch deine Rennzeit.</p>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-accent/25 bg-accent/5 p-4">
        <div className="flex items-start gap-3">
          <Watch size={18} className="mt-0.5 text-accent" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="text-xs font-semibold uppercase tracking-wider text-accent">Zugeordnete Uhr-Aktivität</p><p className="mt-1 text-sm font-semibold">{context.title}</p></div>
              <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted">Trainingskontext</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><span className="block text-xs text-muted">Gesamtdauer</span>{formatDuration(context.durationSeconds)}</div>
              <div><span className="block text-xs text-muted">Gesamtdistanz</span>{formatDistance(context.distanceMeters)}</div>
              <div><span className="block text-xs text-muted">Ø Herzfrequenz</span>{context.avgHeartRate ? `${context.avgHeartRate} bpm` : "–"}</div>
              <div><span className="block text-xs text-muted">Quelle</span>{context.source === "garmin" ? "Garmin" : context.source}</div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">Die Aktivität kann Ablegen, Einrudern und Anlegen enthalten. Sie wird deshalb nicht als offizielle Rennzeit oder Bestleistung gewertet.</p>
          </div>
        </div>
      </div>
    );
  }

  function startEdit(c: CompetitionResult) {
    setEditingId(c.id);
    setEditForm(competitionToEditForm(c));
    setLoggingId(null);
  }

  async function submitEdit(id: string) {
    const res = await fetch("/api/competitions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: editForm.name,
        date: editForm.date,
        location: editForm.location,
        boatClass: editForm.boatClass,
        crew: editForm.crew,
        goal: editForm.goal,
        distanceMeters: Number(editForm.distanceMeters) || 2000,
        result: editForm.result,
        placement: editForm.placement ? Number(editForm.placement) : null,
        avgHeartRate: editForm.avgHeartRate ? Number(editForm.avgHeartRate) : null,
        weather: editForm.weather,
        wind: editForm.wind,
        notes: editForm.notes,
        splits: parseSplits(editForm.splitsRaw),
      }),
    });
    const updated = await res.json();
    setCompetitions((c) => c.map((comp) => (comp.id === id ? updated : comp)));
    setEditingId(null);
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

  function renderEditForm(id: string) {
    return (
      <div className="grid md:grid-cols-2 gap-3">
        <input placeholder="Name" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
          value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
        <input type="date" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
          value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
        <input placeholder="Ort" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
          value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
        <input placeholder="Strecke (m)" type="number" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
          value={editForm.distanceMeters} onChange={(e) => setEditForm({ ...editForm, distanceMeters: e.target.value })} />
        <input placeholder="Bootsklasse" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
          value={editForm.boatClass} onChange={(e) => setEditForm({ ...editForm, boatClass: e.target.value })} />
        <input placeholder="Mannschaft" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
          value={editForm.crew} onChange={(e) => setEditForm({ ...editForm, crew: e.target.value })} />
        <input placeholder="Ziel" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm md:col-span-2"
          value={editForm.goal} onChange={(e) => setEditForm({ ...editForm, goal: e.target.value })} />

        <div className="md:col-span-2 border-t border-border pt-3 mt-1 text-xs text-muted uppercase tracking-wide">Ergebnis</div>
        <input placeholder="Ergebnis (Zeit)" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
          value={editForm.result} onChange={(e) => setEditForm({ ...editForm, result: e.target.value })} />
        <input placeholder="Platzierung" type="number" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
          value={editForm.placement} onChange={(e) => setEditForm({ ...editForm, placement: e.target.value })} />
        <input placeholder="Ø Herzfrequenz" type="number" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
          value={editForm.avgHeartRate} onChange={(e) => setEditForm({ ...editForm, avgHeartRate: e.target.value })} />
        <input placeholder="Wetter" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
          value={editForm.weather} onChange={(e) => setEditForm({ ...editForm, weather: e.target.value })} />
        <input placeholder="Wind" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
          value={editForm.wind} onChange={(e) => setEditForm({ ...editForm, wind: e.target.value })} />
        <textarea placeholder={"Splitzeiten, eine pro Zeile: 500m: 1:45.2"} className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm md:col-span-2"
          value={editForm.splitsRaw} onChange={(e) => setEditForm({ ...editForm, splitsRaw: e.target.value })} />
        <textarea placeholder="Notizen" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm md:col-span-2"
          value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
        <div className="md:col-span-2 flex items-center gap-2">
          <button onClick={() => submitEdit(id)} className="bg-accent text-black rounded-lg px-3 py-2 text-sm font-medium">
            Speichern
          </button>
          <button onClick={() => setEditingId(null)} className="flex items-center gap-1 text-sm text-muted px-3 py-2">
            <X size={14} /> Abbrechen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 text-sm font-medium bg-accent text-black rounded-lg px-3 py-2 hover:opacity-90"
        >
          <Plus size={16} /> Wettkampf planen
        </button>
      </div>

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
                    {formatDate(c.date)} &middot; {c.location} &middot; {c.boatClass}
                  </p>
                  {c.goal && <p className="text-xs text-muted mt-0.5">Ziel: {c.goal}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => startEdit(c)} className="text-muted hover:text-accent">
                  <Pencil size={15} />
                </button>
                <button onClick={() => deleteCompetition(c.id)} className="text-muted hover:text-negative">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              {editingId === c.id ? (
                renderEditForm(c.id)
              ) : loggingId === c.id ? (
                <div className="space-y-4">
                  {renderWatchContext(c.id)}
                  <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-raised/40 p-4">
                    <Flag size={18} className="mt-0.5 text-fuchsia-300" />
                    <div><p className="text-sm font-semibold">Offizielles Rennergebnis</p><p className="mt-1 text-xs leading-relaxed text-muted">Nur die hier eingetragene Zeit zählt als Wettkampfergebnis. Wind, Wasser und Rennverlauf bleiben dabei sichtbar.</p></div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-xs text-muted">Offizielle Rennzeit oder Status
                      <input placeholder="z. B. 6:42,18 oder DNF" className="mt-1 block w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={resultForm.result} onChange={(e) => setResultForm({ ...resultForm, result: e.target.value })} />
                    </label>
                    <label className="text-xs text-muted">Platzierung
                      <input placeholder="z. B. 2" type="number" min="1" className="mt-1 block w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={resultForm.placement} onChange={(e) => setResultForm({ ...resultForm, placement: e.target.value })} />
                    </label>
                    <label className="text-xs text-muted">Ø Herzfrequenz im Rennen, falls bekannt
                      <input placeholder="bpm" type="number" className="mt-1 block w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={resultForm.avgHeartRate} onChange={(e) => setResultForm({ ...resultForm, avgHeartRate: e.target.value })} />
                    </label>
                    <label className="text-xs text-muted">Wetter und Wasser
                      <input placeholder="z. B. sonnig, kabbeliges Wasser" className="mt-1 block w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={resultForm.weather} onChange={(e) => setResultForm({ ...resultForm, weather: e.target.value })} />
                    </label>
                    <label className="text-xs text-muted md:col-span-2">Wind und Strömung
                      <input placeholder="z. B. leichter Gegenwind, Seitenströmung" className="mt-1 block w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={resultForm.wind} onChange={(e) => setResultForm({ ...resultForm, wind: e.target.value })} />
                    </label>
                    <label className="text-xs text-muted md:col-span-2">Offizielle Zwischenzeiten
                      <textarea placeholder={"Eine pro Zeile, z. B. 500m: 1:38,4"} className="mt-1 block w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={resultForm.splitsRaw} onChange={(e) => setResultForm({ ...resultForm, splitsRaw: e.target.value })} />
                    </label>
                    <label className="text-xs text-muted md:col-span-2">Rennnotizen
                      <textarea placeholder="Start, Rennverlauf, Technik, besondere Bedingungen …" className="mt-1 block w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={resultForm.notes} onChange={(e) => setResultForm({ ...resultForm, notes: e.target.value })} />
                    </label>
                  </div>
                  {resultError && <p className="text-sm text-negative">{resultError}</p>}
                  <div className="flex gap-2">
                    <button disabled={savingResult} onClick={() => submitResult(c.id)} className="bg-accent text-black rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50">{savingResult ? "Wird gespeichert …" : "Regatta abschließen"}</button>
                    <button onClick={() => { setLoggingId(null); setResultError(""); }} className="text-sm text-muted px-3 py-2">Abbrechen</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setLoggingId(c.id); setResultForm(emptyResultForm); setResultError(""); }}
                  className="flex items-center gap-1.5 text-sm text-accent hover:underline"
                >
                  <ClipboardCheck size={14} /> Regatta nachbereiten
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
                    {formatDate(c.date)} &middot; {c.location} &middot; {c.boatClass}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => startEdit(c)} className="text-muted hover:text-accent">
                  <Pencil size={15} />
                </button>
                <button onClick={() => deleteCompetition(c.id)} className="text-muted hover:text-negative">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {editingId === c.id ? (
              <div className="mt-4 pt-4 border-t border-border">{renderEditForm(c.id)}</div>
            ) : (
              <>
                <div className="grid sm:grid-cols-3 gap-3 mt-3 text-sm">
                  <div><span className="text-muted text-xs block">Offizielle Rennzeit</span>{c.result || "–"}</div>
                  <div><span className="text-muted text-xs block">Platzierung</span>{c.placement ?? "–"}</div>
                  <div><span className="text-muted text-xs block">Ø Herzfrequenz</span>{c.avgHeartRate ?? "–"}</div>
                </div>

                <div className="mt-4">{renderWatchContext(c.id)}</div>

                {(c.weather || c.wind) && (
                  <div className="mt-3 flex items-start gap-2 text-sm text-muted">
                    <Waves size={15} className="mt-0.5 shrink-0 text-accent" />
                    <span>{[c.weather, c.wind].filter(Boolean).join(" · ")}</span>
                  </div>
                )}

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
              </>
            )}
          </Card>
        ))}
      </section>
    </div>
  );
}
