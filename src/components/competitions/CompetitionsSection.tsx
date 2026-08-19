"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import type { CompetitionResult } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { competitionToEditForm, parseOfficialTime, parseSplits } from "@/lib/competitionsPresentation";
import { CompetitionRaces, emptyRaceForm, type RaceFormValues } from "@/components/competitions/CompetitionRaces";
import { CompetitionWorkoutContext, type WorkoutContext } from "@/components/competitions/CompetitionWorkoutContext";
import { CompetitionEditForm } from "@/components/competitions/CompetitionEditForm";
import { Plus, Trash2, Sparkles, Trophy, Loader2, CalendarClock, Pencil, Waves } from "lucide-react";

const emptyPlanForm = { name: "", date: "", location: "", boatClass: "", crew: "", goal: "", distanceMeters: "2000" };
const emptyEditForm = {
  ...emptyPlanForm,
  result: "", placement: "", splitsRaw: "", avgHeartRate: "", weather: "", wind: "", notes: "",
};

export function CompetitionsSection() {
  const [competitions, setCompetitions] = useState<CompetitionResult[]>([]);
  const [workoutContexts, setWorkoutContexts] = useState<Record<string, WorkoutContext>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [raceEditorId, setRaceEditorId] = useState<string | null>(null);
  const [raceForm, setRaceForm] = useState<RaceFormValues>(emptyRaceForm);
  const [raceError, setRaceError] = useState("");
  const [savingRace, setSavingRace] = useState(false);

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

  function openRaceEditor(competition: CompetitionResult) {
    setRaceEditorId(competition.id);
    setRaceError("");
    setRaceForm({
      ...emptyRaceForm,
      distanceMeters: String(competition.distanceMeters || 2000),
      boatClass: competition.boatClass,
      crew: competition.crew,
      scheduledAt: competition.date ? `${competition.date}T12:00` : "",
    });
  }

  async function saveRace(competitionId: string) {
    const officialTimeSeconds = parseOfficialTime(raceForm.officialTime);
    if (raceForm.status === "completed" && officialTimeSeconds === null && !raceForm.placement) {
      setRaceError("Für ein offizielles Ergebnis brauchst du eine Zeit oder Platzierung.");
      return;
    }
    setSavingRace(true);
    setRaceError("");
    try {
      const response = await fetch(`/api/competitions/${competitionId}/races`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...raceForm,
          scheduledAt: raceForm.scheduledAt ? new Date(raceForm.scheduledAt).toISOString() : null,
          distanceMeters: Number(raceForm.distanceMeters) || 2000,
          officialTimeSeconds,
          placement: raceForm.placement ? Number(raceForm.placement) : null,
          fieldSize: raceForm.fieldSize ? Number(raceForm.fieldSize) : null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Das Rennen konnte nicht gespeichert werden.");
      setCompetitions((items) => items.map((competition) => competition.id === competitionId
        ? { ...competition, races: [...competition.races, payload] }
        : competition));
      setRaceEditorId(null);
      setRaceForm(emptyRaceForm);
    } catch (error) {
      setRaceError(error instanceof Error ? error.message : "Das Rennen konnte nicht gespeichert werden.");
    } finally {
      setSavingRace(false);
    }
  }

  async function deleteRace(competitionId: string, raceId: string) {
    const response = await fetch(`/api/competitions/${competitionId}/races`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raceId }),
    });
    if (!response.ok) return;
    setCompetitions((items) => items.map((competition) => competition.id === competitionId
      ? { ...competition, races: competition.races.filter((race) => race.id !== raceId) }
      : competition));
  }

  function startEdit(c: CompetitionResult) {
    setEditingId(c.id);
    setEditForm(competitionToEditForm(c));
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

            {editingId === c.id && (
              <div className="mt-4 pt-4 border-t border-border">
                <CompetitionEditForm value={editForm} onChange={setEditForm} onSave={() => submitEdit(c.id)} onCancel={() => setEditingId(null)} />
              </div>
            )}

            <CompetitionRaces
              competition={c}
              editorOpen={raceEditorId === c.id}
              raceForm={raceForm}
              raceError={raceError}
              savingRace={savingRace}
              onOpenEditor={() => openRaceEditor(c)}
              onFormChange={setRaceForm}
              onSave={() => saveRace(c.id)}
              onCancelEditor={() => setRaceEditorId(null)}
              onDeleteRace={(raceId) => deleteRace(c.id, raceId)}
            />
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
              <div className="mt-4 pt-4 border-t border-border">
                <CompetitionEditForm value={editForm} onChange={setEditForm} onSave={() => submitEdit(c.id)} onCancel={() => setEditingId(null)} />
              </div>
            ) : c.races.length > 0 ? (
              <CompetitionRaces
                competition={c}
                editorOpen={raceEditorId === c.id}
                raceForm={raceForm}
                raceError={raceError}
                savingRace={savingRace}
                onOpenEditor={() => openRaceEditor(c)}
                onFormChange={setRaceForm}
                onSave={() => saveRace(c.id)}
                onCancelEditor={() => setRaceEditorId(null)}
                onDeleteRace={(raceId) => deleteRace(c.id, raceId)}
              />
            ) : (
              <>
                <div className="grid sm:grid-cols-3 gap-3 mt-3 text-sm">
                  <div><span className="text-muted text-xs block">Offizielle Rennzeit</span>{c.result || "–"}</div>
                  <div><span className="text-muted text-xs block">Platzierung</span>{c.placement ?? "–"}</div>
                  <div><span className="text-muted text-xs block">Ø Herzfrequenz</span>{c.avgHeartRate ?? "–"}</div>
                </div>

                <div className="mt-4"><CompetitionWorkoutContext context={workoutContexts[c.id]} /></div>

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
