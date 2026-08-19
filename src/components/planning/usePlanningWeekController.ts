"use client";

import { useState } from "react";
import { addDays, type PlanningWeek, type PlanningWeekType, type PlanningWorkoutMatch } from "@/lib/planning";
import { planningDateLabel } from "@/lib/planningPresentation";

export async function planningResponseError(response: Response) {
  try {
    const body = await response.json();
    return body?.error?.message ?? "Die Änderung konnte nicht gespeichert werden.";
  } catch {
    return "Die Änderung konnte nicht gespeichert werden.";
  }
}

export function usePlanningWeekController(initialWeek: PlanningWeek, initialMatches: PlanningWorkoutMatch[]) {
  const [week, setWeek] = useState(initialWeek);
  const [matches, setMatches] = useState<PlanningWorkoutMatch[]>(initialMatches);
  const [loading, setLoading] = useState(false);
  const [savingContext, setSavingContext] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [focus, setFocus] = useState(initialWeek.focus);
  const [editingFocus, setEditingFocus] = useState(Boolean(initialWeek.focus));
  const [weekType, setWeekType] = useState<PlanningWeekType>(initialWeek.weekType);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadMatches(start: string) {
    const response = await fetch(`/api/planning/matches?start=${start}`);
    if (response.ok) setMatches(await response.json());
  }

  async function loadWeek(start: string) {
    setLoading(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/planning/week?start=${start}`);
      if (!response.ok) throw new Error(await planningResponseError(response));
      const next = (await response.json()) as PlanningWeek;
      setWeek(next);
      setFocus(next.focus);
      setEditingFocus(Boolean(next.focus));
      setWeekType(next.weekType);
      await loadMatches(start);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Die Woche konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function saveWeekContext() {
    setSavingContext(true);
    setNotice(null);
    try {
      const response = await fetch("/api/planning/week", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: week.weekStart, focus, weekType }),
      });
      if (!response.ok) throw new Error(await planningResponseError(response));
      setWeek(await response.json());
      setEditingFocus(false);
      setNotice("Wochenfokus gespeichert.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Der Wochenfokus konnte nicht gespeichert werden.");
    } finally {
      setSavingContext(false);
    }
  }

  async function duplicateWeek() {
    const targetWeekStart = addDays(week.weekStart, 7);
    const targetLabel = `${planningDateLabel(targetWeekStart, { day: "numeric", month: "short" })} – ${planningDateLabel(addDays(targetWeekStart, 6), { day: "numeric", month: "short", year: "numeric" })}`;
    if (!window.confirm(`Diese Woche nach ${targetLabel} kopieren? Ausgefallene Einheiten werden nicht übernommen.`)) return;
    setDuplicating(true);
    setNotice(null);
    try {
      const response = await fetch("/api/planning/week/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceWeekStart: week.weekStart, targetWeekStart }),
      });
      if (!response.ok) throw new Error(await planningResponseError(response));
      const next = (await response.json()) as PlanningWeek;
      setWeek(next);
      setFocus(next.focus);
      setEditingFocus(Boolean(next.focus));
      setWeekType(next.weekType);
      setNotice("Woche dupliziert. Du siehst jetzt die neue Woche.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Die Woche konnte nicht dupliziert werden.");
    } finally {
      setDuplicating(false);
    }
  }

  return {
    week,
    setWeek,
    matches,
    setMatches,
    loading,
    savingContext,
    duplicating,
    focus,
    setFocus,
    editingFocus,
    setEditingFocus,
    weekType,
    setWeekType,
    notice,
    setNotice,
    loadMatches,
    loadWeek,
    saveWeekContext,
    duplicateWeek,
  };
}
