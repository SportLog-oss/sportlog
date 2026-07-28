"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import type { StrengthExerciseLog, StrengthSession } from "@/lib/types";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

export function StrengthLogSection({
  activityId,
  date,
  defaultTitle,
}: {
  activityId: number;
  date: string;
  defaultTitle: string;
}) {
  const [session, setSession] = useState<StrengthSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [exercises, setExercises] = useState<StrengthExerciseLog[]>([
    { name: "", sets: [{ weightKg: null, reps: null }] },
  ]);

  useEffect(() => {
    fetch("/api/strength")
      .then((r) => r.json())
      .then((sessions: StrengthSession[]) => {
        setSession(sessions.find((s) => s.activityId === activityId) ?? null);
        setLoaded(true);
      });
  }, [activityId]);

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

  async function submit() {
    const res = await fetch("/api/strength", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, title: defaultTitle, activityId, exercises: exercises.filter((e) => e.name) }),
    });
    const created = await res.json();
    setSession(created);
  }

  function toggleExpanded(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function remove() {
    if (!session) return;
    await fetch("/api/strength", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: session.id }),
    });
    setSession(null);
  }

  if (!loaded) return null;

  return (
    <Card title="Krafttraining protokollieren">
      {session ? (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <p className="text-sm text-muted">{session.exercises.length} Übungen protokolliert</p>
            <button onClick={remove} className="text-muted hover:text-negative">
              <Trash2 size={15} />
            </button>
          </div>
          <div className="space-y-2">
            {session.exercises.map((ex, i) => {
              const isOpen = expanded.has(i);
              return (
                <div key={i} className="rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => toggleExpanded(i)}
                    className="w-full flex items-center justify-between bg-surface-raised px-3 py-2 text-sm font-medium"
                  >
                    <span>{ex.name}</span>
                    <span className="flex items-center gap-2 text-xs text-muted font-normal">
                      {ex.sets.length} Sätze
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </span>
                  </button>
                  {isOpen && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-muted">
                          <th className="text-left px-3 py-1.5 font-normal">Satz</th>
                          <th className="text-right px-3 py-1.5 font-normal">Wiederholungen</th>
                          <th className="text-right px-3 py-1.5 font-normal">kg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ex.sets.map((set, si) => (
                          <tr key={si} className="border-t border-border">
                            <td className="px-3 py-1.5">{si + 1}</td>
                            <td className="px-3 py-1.5 text-right">{set.reps ?? "–"}</td>
                            <td className="px-3 py-1.5 text-right">{set.weightKg ?? "–"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {exercises.map((ex, exIdx) => (
            <div key={exIdx} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  placeholder="Übung (z.B. Kniebeuge)"
                  className="flex-1 bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                  value={ex.name}
                  onChange={(e) => updateExercise(exIdx, e.target.value)}
                />
                <button onClick={() => removeExercise(exIdx)} className="text-muted hover:text-negative">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="space-y-1.5">
                {ex.sets.map((s, setIdx) => (
                  <div key={setIdx} className="flex items-center gap-2">
                    <span className="text-xs text-muted w-12">Satz {setIdx + 1}</span>
                    <input
                      placeholder="kg"
                      type="number"
                      className="w-20 bg-surface-raised border border-border rounded-lg px-2 py-1.5 text-sm"
                      value={s.weightKg ?? ""}
                      onChange={(e) => updateSet(exIdx, setIdx, "weightKg", e.target.value)}
                    />
                    <input
                      placeholder="Wdh."
                      type="number"
                      className="w-20 bg-surface-raised border border-border rounded-lg px-2 py-1.5 text-sm"
                      value={s.reps ?? ""}
                      onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value)}
                    />
                  </div>
                ))}
                <button onClick={() => addSet(exIdx)} className="text-xs text-accent hover:underline">
                  + Satz hinzufügen
                </button>
              </div>
            </div>
          ))}
          <button onClick={addExercise} className="text-sm text-accent hover:underline">
            + Übung hinzufügen
          </button>
          <button onClick={submit} className="bg-accent text-black rounded-lg px-3 py-2 text-sm font-medium block">
            Session speichern
          </button>
        </div>
      )}
    </Card>
  );
}
