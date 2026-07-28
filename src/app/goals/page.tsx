"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import type { Goal } from "@/lib/types";
import { Plus, Trash2, Target } from "lucide-react";

const CATEGORY_LABELS: Record<Goal["category"], string> = {
  wettkampf: "Wettkampf",
  leistung: "Leistung",
  kraft: "Kraft",
  umfang: "Umfang",
  sonstiges: "Sonstiges",
};

function computeProgress(goal: Goal): number | null {
  if (goal.currentValue === null || goal.targetValue === null || goal.targetValue === 0) return null;
  const lowerIsBetter = goal.unit.toLowerCase().includes("sekunde") || goal.metricLabel.toLowerCase().includes("platz");
  const ratio = lowerIsBetter
    ? goal.targetValue / goal.currentValue
    : goal.currentValue / goal.targetValue;
  return Math.max(0, Math.min(1, ratio));
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "leistung" as Goal["category"],
    targetDate: "",
    metricLabel: "",
    targetValue: "",
    unit: "",
    currentValue: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then(setGoals);
  }, []);

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        targetValue: form.targetValue ? Number(form.targetValue) : null,
        currentValue: form.currentValue ? Number(form.currentValue) : null,
      }),
    });
    const created = await res.json();
    setGoals((g) => [...g, created]);
    setShowForm(false);
    setForm({ title: "", category: "leistung", targetDate: "", metricLabel: "", targetValue: "", unit: "", currentValue: "", notes: "" });
  }

  async function deleteGoal(id: string) {
    await fetch("/api/goals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setGoals((g) => g.filter((goal) => goal.id !== id));
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="border-b border-border px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Ziele</h1>
          <p className="text-sm text-muted mt-0.5">Langfristige Saison- und Leistungsziele</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 text-sm font-medium bg-accent text-black rounded-lg px-3 py-2 hover:opacity-90"
        >
          <Plus size={16} /> Neues Ziel
        </button>
      </header>

      <div className="p-8 space-y-6">
        {showForm && (
          <Card title="Neues Ziel anlegen">
            <form onSubmit={addGoal} className="grid md:grid-cols-2 gap-3">
              <input
                required
                placeholder="Titel (z.B. Deutsche Meisterschaft)"
                className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm md:col-span-2"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <select
                className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Goal["category"] })}
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <input
                required
                type="date"
                className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
              />
              <input
                placeholder="Kennzahl (z.B. 2km-Zeit)"
                className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={form.metricLabel}
                onChange={(e) => setForm({ ...form, metricLabel: e.target.value })}
              />
              <input
                placeholder="Einheit (z.B. Sekunden, Watt, kg)"
                className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
              <input
                placeholder="Zielwert"
                type="number"
                className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={form.targetValue}
                onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
              />
              <input
                placeholder="Aktueller Wert (optional)"
                type="number"
                className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
                value={form.currentValue}
                onChange={(e) => setForm({ ...form, currentValue: e.target.value })}
              />
              <textarea
                placeholder="Notizen"
                className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm md:col-span-2"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <button className="md:col-span-2 bg-accent text-black rounded-lg px-3 py-2 text-sm font-medium">
                Speichern
              </button>
            </form>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const progress = computeProgress(goal);
            return (
              <Card key={goal.id}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Target size={16} className="text-accent" />
                    <span className="font-semibold text-sm">{goal.title}</span>
                  </div>
                  <button onClick={() => deleteGoal(goal.id)} className="text-muted hover:text-negative">
                    <Trash2 size={15} />
                  </button>
                </div>
                <p className="text-xs text-muted mt-1">
                  {CATEGORY_LABELS[goal.category]} &middot; bis {goal.targetDate}
                </p>
                {goal.targetValue !== null && (
                  <p className="text-sm mt-2">
                    {goal.metricLabel}: <span className="font-medium">{goal.currentValue ?? "–"}</span> / {goal.targetValue} {goal.unit}
                  </p>
                )}
                {progress !== null && (
                  <div className="mt-2 h-2 rounded-full bg-surface-raised overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full"
                      style={{ width: `${(progress * 100).toFixed(0)}%` }}
                    />
                  </div>
                )}
                {goal.notes && <p className="text-xs text-muted mt-2">{goal.notes}</p>}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
