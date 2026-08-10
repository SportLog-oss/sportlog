"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Plus, X } from "lucide-react";
import type { ImportedTrainingLogData, TrainingLogEntry } from "@/lib/types";
import type { TrainingDeviationReason, TrainingFeeling, TrainingReflection } from "@/lib/planning";

const SCALE = Array.from({ length: 11 }, (_, i) => i);

function ScalePicker({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SCALE.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`w-7 h-7 rounded-full border text-xs ${
            value === n ? "bg-accent text-black border-accent font-bold" : "text-muted border-border"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function TrainingLogSection({
  activityId,
  date,
  imported,
}: {
  activityId: number;
  date: string;
  imported?: ImportedTrainingLogData;
}) {
  const [entry, setEntry] = useState<Partial<TrainingLogEntry>>({ pain: [], injury: false, soreness: null, rpe: null, notes: "" });
  const [initial, setInitial] = useState<Partial<TrainingLogEntry>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newBodyPart, setNewBodyPart] = useState("");
  const [reflection, setReflection] = useState<TrainingReflection | null>(null);
  const [initialReflection, setInitialReflection] = useState<TrainingReflection | null>(null);
  const [savingReflection, setSavingReflection] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/training/${activityId}/log`).then((r) => r.json()),
      fetch(`/api/training/${activityId}/reflection`).then((r) => r.json()),
    ]).then(([existing, existingReflection]) => {
        const data = existing ?? { pain: [], injury: false, soreness: null, rpe: null, notes: "" };
        setEntry(data);
        setInitial(data);
        setReflection(existingReflection);
        setInitialReflection(existingReflection);
        setLoaded(true);
      });
  }, [activityId]);

  function addPain() {
    if (!newBodyPart.trim()) return;
    setEntry((e) => ({ ...e, pain: [...(e.pain ?? []), { bodyPart: newBodyPart.trim(), intensity: 5 }] }));
    setNewBodyPart("");
  }

  function updatePainIntensity(idx: number, intensity: number) {
    setEntry((e) => ({ ...e, pain: (e.pain ?? []).map((p, i) => (i === idx ? { ...p, intensity } : p)) }));
  }

  function removePain(idx: number) {
    setEntry((e) => ({ ...e, pain: (e.pain ?? []).filter((_, i) => i !== idx) }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/training/${activityId}/log`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...entry, date }),
      });
      const saved = await res.json();
      setEntry(saved);
      setInitial(saved);
    } finally {
      setSaving(false);
    }
  }

  async function saveReflection() {
    if (!reflection) return;
    setSavingReflection(true);
    try {
      const res = await fetch(`/api/training/${activityId}/reflection`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feeling: reflection.feeling,
          perceivedExertion: reflection.perceivedExertion,
          deviationReason: reflection.deviationReason,
          note: reflection.note,
        }),
      });
      if (!res.ok) throw new Error("Reflexion konnte nicht gespeichert werden.");
      const saved = await res.json();
      setReflection(saved);
      setInitialReflection(saved);
    } finally {
      setSavingReflection(false);
    }
  }

  if (!loaded) return null;
  const dirty = JSON.stringify(entry) !== JSON.stringify(initial);
  const reflectionDirty = JSON.stringify(reflection) !== JSON.stringify(initialReflection);

  return (
    <Card title="Trainingsprotokoll" subtitle="Schmerzen, Muskelkater, Belastungsempfinden">
      <div className="space-y-5">
        {reflection && (
          <div className="rounded-xl border border-accent/30 bg-accent-soft/30 p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Deine Reflexion aus dem Plan</p>
              <p className="mt-1 text-xs text-muted">Dies ist derselbe Eintrag wie in der zugeordneten Plan-Einheit.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs text-muted">
                Wie hat sich die Einheit angefühlt?
                <select value={reflection.feeling ?? ""} onChange={(event) => setReflection({ ...reflection, feeling: (event.target.value || null) as TrainingFeeling | null })} className="mt-1.5 w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50">
                  <option value="">Von der Uhr übernommen</option>
                  <option value="great">Sehr gut</option><option value="good">Gut</option><option value="okay">Okay</option><option value="hard">Anstrengend</option><option value="bad">Schlecht</option>
                </select>
              </label>
              <label className="text-xs text-muted">
                Warum wich das Training vom Plan ab?
                <select value={reflection.deviationReason ?? ""} onChange={(event) => setReflection({ ...reflection, deviationReason: (event.target.value || null) as TrainingDeviationReason | null })} className="mt-1.5 w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50">
                  <option value="">Kein Grund ausgewählt</option>
                  <option value="felt-good">Ich fühlte mich stärker als erwartet</option><option value="felt-tired">Ich war müder als erwartet</option><option value="schedule">Zeit oder Alltag</option><option value="conditions">Bedingungen oder Material</option><option value="plan-adjustment">Plan bewusst angepasst</option><option value="other">Anderer Grund</option>
                </select>
              </label>
            </div>
            <label className="block text-xs text-muted">
              Reflexionsnotiz
              <textarea value={reflection.note} onChange={(event) => setReflection({ ...reflection, note: event.target.value })} className="mt-1.5 min-h-20 w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50" />
            </label>
            {reflectionDirty && (
              <button onClick={saveReflection} disabled={savingReflection} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-50">
                {savingReflection ? "Reflexion wird gespeichert…" : "Reflexion speichern"}
              </button>
            )}
          </div>
        )}
        {imported && imported.items.length > 0 && (
          <div className="rounded-lg border border-accent/30 bg-accent-soft/40 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold">Importierte Trainingswerte</p>
              <span className="text-[11px] text-accent">{imported.source} · schreibgeschützt</span>
            </div>
            <dl className="grid sm:grid-cols-2 gap-2">
              {imported.items.map((item) => (
                <div key={item.key} className="flex justify-between gap-3 text-xs">
                  <dt className="text-muted">{item.label}</dt>
                  <dd className="font-medium">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        <div>
          <p className="text-xs text-muted mb-2">Schmerzen</p>
          <div className="space-y-2">
            {(entry.pain ?? []).map((p, i) => (
              <div key={`${p.bodyPart}-${i}`} className="flex items-center gap-3">
                <span className="text-sm w-28 shrink-0">{p.bodyPart}</span>
                <ScalePicker value={p.intensity} onChange={(v) => updatePainIntensity(i, v)} />
                <button onClick={() => removePain(i)} className="text-negative">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              value={newBodyPart}
              onChange={(e) => setNewBodyPart(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPain()}
              placeholder="Körperstelle (z.B. Knie rechts)…"
              className="flex-1 bg-surface-raised border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-accent/50"
            />
            <button onClick={addPain} className="bg-accent text-black rounded-lg px-3 py-1.5">
              <Plus size={16} />
            </button>
          </div>
        </div>

        <label className="flex items-center justify-between">
          <span className="text-xs text-muted">Verletzung markieren</span>
          <input
            type="checkbox"
            checked={entry.injury ?? false}
            onChange={(e) => setEntry((prev) => ({ ...prev, injury: e.target.checked }))}
            className="accent-accent w-4 h-4"
          />
        </label>

        <div>
          <p className="text-xs text-muted mb-2">Muskelkater (0 = keiner, 10 = extrem)</p>
          <ScalePicker value={entry.soreness ?? null} onChange={(v) => setEntry((e) => ({ ...e, soreness: v }))} />
        </div>

        {imported?.rpe == null && <div>
          <p className="text-xs text-muted mb-2">RPE – subjektives Belastungsempfinden (0 = keine, 10 = maximal)</p>
          <ScalePicker value={entry.rpe ?? null} onChange={(v) => setEntry((e) => ({ ...e, rpe: v }))} />
        </div>}

        <div>
          <p className="text-xs text-muted mb-2">Gesundheitsnotiz</p>
          <textarea
            value={entry.notes ?? ""}
            onChange={(e) => setEntry((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Ergänzung zu Schmerzen, Verletzung oder Muskelkater"
            className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm min-h-20 focus:outline-none focus:border-accent/50"
          />
        </div>

        {dirty && (
          <button onClick={save} disabled={saving} className="bg-accent text-black rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
            {saving ? "Speichern…" : "Speichern"}
          </button>
        )}
      </div>
    </Card>
  );
}
