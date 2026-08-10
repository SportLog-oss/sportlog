"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import type { Goal } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { Plus, Trash2, Target, Pencil, CheckCircle2, Circle, X } from "lucide-react";

const CATEGORY_LABELS: Record<Goal["category"], string> = {
  wettkampf: "Wettkampf",
  leistung: "Leistung",
  kraft: "Kraft",
  umfang: "Umfang",
  sonstiges: "Sonstiges",
};

const emptyForm = {
  title: "",
  category: "leistung" as Goal["category"],
  targetDate: "",
  metricLabel: "",
  targetValue: "",
  unit: "",
  currentValue: "",
  notes: "",
};

function computeProgress(goal: Goal): number | null {
  if (goal.currentValue === null || goal.targetValue === null || goal.targetValue === 0) return null;
  const lowerIsBetter = goal.unit.toLowerCase().includes("sekunde") || goal.metricLabel.toLowerCase().includes("platz");
  const ratio = lowerIsBetter
    ? goal.targetValue / goal.currentValue
    : goal.currentValue / goal.targetValue;
  return Math.max(0, Math.min(1, ratio));
}

function goalToForm(goal: Goal) {
  return {
    title: goal.title,
    category: goal.category,
    targetDate: goal.targetDate,
    metricLabel: goal.metricLabel,
    targetValue: goal.targetValue !== null ? String(goal.targetValue) : "",
    unit: goal.unit,
    currentValue: goal.currentValue !== null ? String(goal.currentValue) : "",
    notes: goal.notes,
  };
}

export function GoalsSection() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then(setGoals);
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEdit(goal: Goal) {
    setEditingId(goal.id);
    setForm(goalToForm(goal));
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      targetValue: form.targetValue ? Number(form.targetValue) : null,
      currentValue: form.currentValue ? Number(form.currentValue) : null,
    };

    if (editingId) {
      const res = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, id: editingId }),
      });
      const updated = await res.json();
      setGoals((g) => g.map((goal) => (goal.id === editingId ? updated : goal)));
    } else {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      setGoals((g) => [...g, created]);
    }

    cancelForm();
  }

  async function deleteGoal(id: string) {
    await fetch("/api/goals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setGoals((g) => g.filter((goal) => goal.id !== id));
  }

  async function toggleAchieved(goal: Goal) {
    const res = await fetch("/api/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: goal.id, achieved: !goal.achieved }),
    });
    const updated = await res.json();
    setGoals((g) => g.map((x) => (x.id === goal.id ? updated : x)));
  }

  const activeGoals = goals.filter((g) => !g.achieved);
  const achievedGoals = goals.filter((g) => g.achieved);

  function renderGoalCard(goal: Goal) {
    const progress = computeProgress(goal);
    return (
      <Card key={goal.id} className={goal.achieved ? "opacity-70" : undefined}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => toggleAchieved(goal)} className="shrink-0 text-muted hover:text-positive" title="Als erreicht markieren">
              {goal.achieved ? <CheckCircle2 size={18} className="text-positive" /> : <Circle size={18} />}
            </button>
            <span className={"font-semibold text-sm truncate" + (goal.achieved ? " line-through" : "")}>{goal.title}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => startEdit(goal)} className="text-muted hover:text-accent">
              <Pencil size={15} />
            </button>
            <button onClick={() => deleteGoal(goal.id)} className="text-muted hover:text-negative">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
        <p className="text-xs text-muted mt-1">
          {CATEGORY_LABELS[goal.category]} &middot; bis {formatDate(goal.targetDate)}
        </p>
        {goal.targetValue !== null && (
          <p className="text-sm mt-2">
            {goal.metricLabel}: <span className="font-medium">{goal.currentValue ?? "–"}</span> / {goal.targetValue} {goal.unit}
          </p>
        )}
        {progress !== null && (
          <div className="mt-2 h-2 rounded-full bg-surface-raised overflow-hidden">
            <div className="h-full bg-accent rounded-full" style={{ width: `${(progress * 100).toFixed(0)}%` }} />
          </div>
        )}
        {goal.notes && <p className="text-xs text-muted mt-2">{goal.notes}</p>}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={() => (showForm ? cancelForm() : startCreate())}
          className="flex items-center gap-1.5 text-sm font-medium bg-accent text-black rounded-lg px-3 py-2 hover:opacity-90"
        >
          <Plus size={16} /> Neues Ziel
        </button>
      </div>

      {showForm && (
        <Card title={editingId ? "Ziel bearbeiten" : "Neues Ziel anlegen"}>
          <form onSubmit={submitForm} className="grid md:grid-cols-2 gap-3">
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
            <div className="md:col-span-2 flex items-center gap-2">
              <button className="bg-accent text-black rounded-lg px-3 py-2 text-sm font-medium">
                {editingId ? "Speichern" : "Anlegen"}
              </button>
              <button type="button" onClick={cancelForm} className="flex items-center gap-1 text-sm text-muted px-3 py-2">
                <X size={14} /> Abbrechen
              </button>
            </div>
          </form>
        </Card>
      )}

      <div>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Aktuelle Ziele</h2>
        {activeGoals.length === 0 && <p className="text-sm text-muted">Keine aktiven Ziele.</p>}
        <div className="grid md:grid-cols-2 gap-4">{activeGoals.map(renderGoalCard)}</div>
      </div>

      {achievedGoals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Target size={13} /> Erreichte Ziele
          </h2>
          <div className="grid md:grid-cols-2 gap-4">{achievedGoals.map(renderGoalCard)}</div>
        </div>
      )}
    </div>
  );
}
