"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Plus, X } from "lucide-react";
import type { TrainingLogEntry } from "@/lib/types";

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

export function TrainingLogSection({ activityId, date }: { activityId: number; date: string }) {
  const [entry, setEntry] = useState<Partial<TrainingLogEntry>>({ pain: [], injury: false, soreness: null, rpe: null, notes: "" });
  const [initial, setInitial] = useState<Partial<TrainingLogEntry>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newBodyPart, setNewBodyPart] = useState("");

  useEffect(() => {
    fetch(`/api/training/${activityId}/log`)
      .then((r) => r.json())
      .then((existing) => {
        const data = existing ?? { pain: [], injury: false, soreness: null, rpe: null, notes: "" };
        setEntry(data);
        setInitial(data);
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

  if (!loaded) return null;
  const dirty = JSON.stringify(entry) !== JSON.stringify(initial);

  return (
    <Card title="Trainingsprotokoll" subtitle="Schmerzen, Muskelkater, Belastungsempfinden">
      <div className="space-y-5">
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

        <div>
          <p className="text-xs text-muted mb-2">RPE – subjektives Belastungsempfinden (0 = keine, 10 = maximal)</p>
          <ScalePicker value={entry.rpe ?? null} onChange={(v) => setEntry((e) => ({ ...e, rpe: v }))} />
        </div>

        <div>
          <p className="text-xs text-muted mb-2">Notizen</p>
          <textarea
            value={entry.notes ?? ""}
            onChange={(e) => setEntry((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Wie hat sich die Einheit angefühlt?"
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
