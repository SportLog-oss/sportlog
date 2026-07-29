"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Plus, X, Stethoscope, Trash2 } from "lucide-react";
import type { IllnessLogEntry } from "@/lib/types";

const emptyForm = {
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  symptoms: [] as string[],
  medications: [] as string[],
  doctorVisits: false,
  trainingPausedFrom: "",
  trainingPausedUntil: "",
  returnedToTrainingOn: "",
  notes: "",
};

function TagInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  function add() {
    if (!draft.trim()) return;
    onChange([...values, draft.trim()]);
    setDraft("");
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map((v, i) => (
          <span key={i} className="flex items-center gap-1 bg-surface-raised border border-border rounded-full px-2.5 py-1 text-xs">
            {v}
            <button onClick={() => onChange(values.filter((_, idx) => idx !== i))}>
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="flex-1 bg-surface-raised border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-accent/50"
        />
        <button onClick={add} className="bg-accent text-black rounded-lg px-3 py-1.5">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

export function IllnessLogSection() {
  const [entries, setEntries] = useState<IllnessLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  function load() {
    fetch("/api/health/illness")
      .then((r) => r.json())
      .then((d) => {
        setEntries(d);
        setLoading(false);
      });
  }

  useEffect(load, []);

  async function save() {
    await fetch("/api/health/illness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: form.startDate,
        endDate: form.endDate || null,
        symptoms: form.symptoms,
        medications: form.medications,
        doctorVisits: form.doctorVisits,
        trainingPausedFrom: form.trainingPausedFrom || null,
        trainingPausedUntil: form.trainingPausedUntil || null,
        returnedToTrainingOn: form.returnedToTrainingOn || null,
        notes: form.notes,
      }),
    });
    setForm(emptyForm);
    setShowForm(false);
    load();
  }

  async function remove(id: string) {
    await fetch("/api/health/illness", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  if (loading) return null;

  const active = entries.filter((e) => !e.endDate);
  const past = entries.filter((e) => e.endDate);

  return (
    <Card title="Krankheiten & Verletzungen" subtitle="Wird dem KI-Coach für angepasste Trainingsempfehlungen zur Verfügung gestellt">
      <div className="space-y-4">
        {active.length > 0 && (
          <div className="space-y-2">
            {active.map((e) => (
              <div key={e.id} className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3">
                <Stethoscope size={15} className="text-warning shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">Aktiv seit {e.startDate}</p>
                  <p className="text-muted text-xs mt-0.5">{e.symptoms.join(", ") || "keine Symptome angegeben"}</p>
                  {e.notes && <p className="text-xs mt-1">{e.notes}</p>}
                </div>
                <button onClick={() => remove(e.id)} className="text-muted hover:text-negative">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {past.length > 0 && (
          <div className="space-y-1.5">
            {past.map((e) => (
              <div key={e.id} className="flex items-center gap-3 text-sm text-muted">
                <span className="w-32 shrink-0">
                  {e.startDate} – {e.endDate}
                </span>
                <span className="flex-1">{e.symptoms.join(", ") || "–"}</span>
                <button onClick={() => remove(e.id)} className="hover:text-negative">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {active.length === 0 && past.length === 0 && <p className="text-sm text-muted">Keine Einträge.</p>}

        {!showForm ? (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-sm text-accent">
            <Plus size={15} /> Krankheit/Verletzung erfassen
          </button>
        ) : (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-muted">
                Beginn
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="block w-full mt-1 bg-surface-raised border border-border rounded-lg px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs text-muted">
                Ende (leer = aktiv)
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="block w-full mt-1 bg-surface-raised border border-border rounded-lg px-2 py-1.5 text-sm"
                />
              </label>
            </div>
            <div>
              <p className="text-xs text-muted mb-1.5">Symptome</p>
              <TagInput values={form.symptoms} onChange={(v) => setForm((f) => ({ ...f, symptoms: v }))} placeholder="Symptom hinzufügen…" />
            </div>
            <div>
              <p className="text-xs text-muted mb-1.5">Medikamente</p>
              <TagInput values={form.medications} onChange={(v) => setForm((f) => ({ ...f, medications: v }))} placeholder="Medikament hinzufügen…" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.doctorVisits}
                onChange={(e) => setForm((f) => ({ ...f, doctorVisits: e.target.checked }))}
                className="accent-accent w-4 h-4"
              />
              Arztbesuch(e)
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="text-xs text-muted">
                Pause von
                <input
                  type="date"
                  value={form.trainingPausedFrom}
                  onChange={(e) => setForm((f) => ({ ...f, trainingPausedFrom: e.target.value }))}
                  className="block w-full mt-1 bg-surface-raised border border-border rounded-lg px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs text-muted">
                Pause bis
                <input
                  type="date"
                  value={form.trainingPausedUntil}
                  onChange={(e) => setForm((f) => ({ ...f, trainingPausedUntil: e.target.value }))}
                  className="block w-full mt-1 bg-surface-raised border border-border rounded-lg px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs text-muted">
                Rückkehr Training
                <input
                  type="date"
                  value={form.returnedToTrainingOn}
                  onChange={(e) => setForm((f) => ({ ...f, returnedToTrainingOn: e.target.value }))}
                  className="block w-full mt-1 bg-surface-raised border border-border rounded-lg px-2 py-1.5 text-sm"
                />
              </label>
            </div>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notizen…"
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm min-h-16"
            />
            <div className="flex gap-2">
              <button onClick={save} className="bg-accent text-black rounded-lg px-4 py-2 text-sm font-medium">
                Speichern
              </button>
              <button onClick={() => setShowForm(false)} className="text-sm text-muted px-4 py-2">
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
