"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleOff,
  Copy,
  Clock3,
  LoaderCircle,
  Lightbulb,
  MessageSquareText,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trophy,
  Trash2,
  X,
} from "lucide-react";
import clsx from "clsx";
import { addDays, mondayForDate, type PlannedSession, type PlanningIntensity, type PlanningWeek, type PlanningWeekType, type PlanningWorkoutMatch, type TrainingDeviationReason, type TrainingFeeling } from "@/lib/planning";
import type { CompetitionResult, TrainingLogEntry } from "@/lib/types";
import { adaptationFor, type AdaptationSuggestion } from "@/lib/trainingAdaptation";

const WEEK_TYPES: { value: PlanningWeekType; label: string }[] = [
  { value: "normal", label: "Normale Woche" },
  { value: "regeneration", label: "Regeneration" },
  { value: "pause", label: "Pause" },
  { value: "competition", label: "Wettkampf" },
];

const INTENSITIES: { value: PlanningIntensity; label: string; color: string }[] = [
  { value: "recovery", label: "Regeneration", color: "bg-sky-400" },
  { value: "easy", label: "Locker", color: "bg-positive" },
  { value: "moderate", label: "Moderat", color: "bg-warning" },
  { value: "hard", label: "Hart", color: "bg-orange-400" },
  { value: "competition", label: "Wettkampf", color: "bg-fuchsia-400" },
];

const LOAD_FACTORS: Record<PlanningIntensity, number> = { recovery: 0.35, easy: 0.55, moderate: 0.75, hard: 1, competition: 1.15 };

const SPORT_OPTIONS = ["Rudern", "Laufen", "Radfahren", "Krafttraining", "Schwimmen", "Mobilität", "Regeneration", "Sonstiges"];

type SessionDraft = {
  id?: string;
  scheduledDate: string;
  title: string;
  sportType: string;
  plannedDurationMin: string;
  plannedIntensity: PlanningIntensity | "";
  timeOfDay: "morning" | "midday" | "afternoon" | "evening" | "custom";
  description: string;
};

type ReflectionDraft = {
  plannedSessionId: string;
  workoutId: string;
  feeling: TrainingFeeling | "";
  perceivedExertion: string;
  deviationReason: TrainingDeviationReason | "";
  note: string;
};

type RegattaDraft = { name: string; date: string; location: string; distanceMeters: string; boatClass: string; crew: string; goal: string };

const EMPTY_REGATTA: RegattaDraft = { name: "", date: "", location: "", distanceMeters: "2000", boatClass: "", crew: "", goal: "" };

function emptyDraft(date: string): SessionDraft {
  return { scheduledDate: date, title: "", sportType: "Rudern", plannedDurationMin: "", plannedIntensity: "easy", timeOfDay: "afternoon", description: "" };
}

function dateLabel(date: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", options);
}

function minutesLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} h${rest ? ` ${rest} min` : ""}` : `${rest} min`;
}

function feelingFromGarmin(value: number | null): TrainingFeeling | null {
  if (value === null) return null;
  if (value >= 80) return "great";
  if (value >= 60) return "good";
  if (value >= 40) return "okay";
  if (value >= 20) return "hard";
  return "bad";
}

async function responseError(response: Response) {
  try {
    const body = await response.json();
    return body?.error?.message ?? "Die Änderung konnte nicht gespeichert werden.";
  } catch {
    return "Die Änderung konnte nicht gespeichert werden.";
  }
}

export function WeekPlanner({ initialWeek, initialMatches, initialCompetitions }: { initialWeek: PlanningWeek; initialMatches: PlanningWorkoutMatch[]; initialCompetitions: CompetitionResult[] }) {
  const [week, setWeek] = useState(initialWeek);
  const [loading, setLoading] = useState(false);
  const [savingContext, setSavingContext] = useState(false);
  const [modal, setModal] = useState<SessionDraft | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [matches, setMatches] = useState<PlanningWorkoutMatch[]>(initialMatches);
  const [focus, setFocus] = useState(initialWeek.focus);
  const [editingFocus, setEditingFocus] = useState(Boolean(initialWeek.focus));
  const [weekType, setWeekType] = useState<PlanningWeekType>(initialWeek.weekType);
  const [notice, setNotice] = useState<string | null>(null);
  const [reflectionModal, setReflectionModal] = useState<ReflectionDraft | null>(null);
  const [reflectionSaving, setReflectionSaving] = useState(false);
  const [reviewLog, setReviewLog] = useState<Pick<TrainingLogEntry, "pain" | "injury" | "soreness" | "rpe" | "notes">>({ pain: [], injury: false, soreness: null, rpe: null, notes: "" });
  const [reviewLogLoading, setReviewLogLoading] = useState(false);
  const [newPainBodyPart, setNewPainBodyPart] = useState("");
  const [reviewImported, setReviewImported] = useState<{ rpe: number | null; feel: number | null }>({ rpe: null, feel: null });
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
  const [competitions, setCompetitions] = useState(initialCompetitions);
  const [regattaModal, setRegattaModal] = useState<RegattaDraft | null>(null);
  const [regattaSaving, setRegattaSaving] = useState(false);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(week.weekStart, index)), [week.weekStart]);
  const activeSessions = week.sessions.filter((session) => session.status !== "cancelled");
  const plannedCount = activeSessions.length;
  const completedCount = new Set(matches.filter((match) => match.status === "confirmed").map((match) => match.plannedSessionId)).size;
  const dayLoads = days.map((day) => {
    const sessions = activeSessions.filter((session) => session.scheduledDate === day);
    const score = sessions.reduce((sum, session) => sum + (session.plannedDurationMin ?? 45) * (session.plannedIntensity ? LOAD_FACTORS[session.plannedIntensity] : 0.6), 0);
    const strongest = sessions.reduce<PlanningIntensity | null>((current, session) => {
      if (!session.plannedIntensity) return current;
      if (!current || LOAD_FACTORS[session.plannedIntensity] > LOAD_FACTORS[current]) return session.plannedIntensity;
      return current;
    }, null);
    return { day, score, sessions: sessions.length, strongest };
  });
  const maxDayLoad = Math.max(1, ...dayLoads.map((day) => day.score));
  const detailSession = detailSessionId ? week.sessions.find((session) => session.id === detailSessionId) ?? null : null;
  const detailMatches = detailSession ? matches.filter((match) => match.plannedSessionId === detailSession.id) : [];

  async function loadMatches(start: string) {
    const response = await fetch(`/api/planning/matches?start=${start}`);
    if (response.ok) setMatches(await response.json());
  }

  async function loadWeek(start: string) {
    setLoading(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/planning/week?start=${start}`);
      if (!response.ok) throw new Error(await responseError(response));
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
      if (!response.ok) throw new Error(await responseError(response));
      setWeek(await response.json());
      setEditingFocus(false);
      setNotice("Wochenfokus gespeichert.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Der Wochenfokus konnte nicht gespeichert werden.");
    } finally {
      setSavingContext(false);
    }
  }

  function editSession(session: PlannedSession) {
    setModal({
      id: session.id,
      scheduledDate: session.scheduledDate,
      title: session.title,
      sportType: session.sportType,
      plannedDurationMin: session.plannedDurationMin?.toString() ?? "",
      plannedIntensity: session.plannedIntensity ?? "",
      timeOfDay: session.timeOfDay ?? "afternoon",
      description: session.description,
    });
  }

  function reviewAdaptation(session: PlannedSession, suggestion: AdaptationSuggestion) {
    editSession(session);
    setModal((current) => current ? {
      ...current,
      plannedDurationMin: session.plannedDurationMin ? Math.max(10, Math.round(session.plannedDurationMin * suggestion.durationFactor / 5) * 5).toString() : "",
      plannedIntensity: suggestion.intensity,
    } : current);
    setNotice(`Vorschlag für „${session.title}“ geöffnet. Erst dein Speichern ändert den Plan.`);
  }

  async function saveSession(event: FormEvent) {
    event.preventDefault();
    if (!modal) return;
    setModalSaving(true);
    setNotice(null);
    const payload = {
      scheduledDate: modal.scheduledDate,
      title: modal.title,
      sportType: modal.sportType,
      plannedDurationMin: modal.plannedDurationMin ? Number(modal.plannedDurationMin) : null,
      plannedIntensity: modal.plannedIntensity || null,
      timeOfDay: modal.timeOfDay,
      description: modal.description,
    };
    try {
      const response = await fetch(modal.id ? `/api/planning/sessions/${modal.id}` : "/api/planning/sessions", {
        method: modal.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setModal(null);
      await loadWeek(week.weekStart);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Die Einheit konnte nicht gespeichert werden.");
    } finally {
      setModalSaving(false);
    }
  }

  async function updateStatus(session: PlannedSession, status: "cancelled" | "planned") {
    setNotice(null);
    const response = await fetch(`/api/planning/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, changeReason: status === "cancelled" ? "Manuell ausgefallen" : null }),
    });
    if (!response.ok) setNotice(await responseError(response));
    else await loadWeek(week.weekStart);
  }

  async function removeSession(session: PlannedSession) {
    if (!window.confirm(`„${session.title}“ wirklich löschen? Ausgefallene Einheiten besser als ausgefallen markieren.`)) return;
    const response = await fetch(`/api/planning/sessions/${session.id}`, { method: "DELETE" });
    if (!response.ok) setNotice(await responseError(response));
    else await loadWeek(week.weekStart);
  }

  async function duplicateSession(session: PlannedSession) {
    setNotice(null);
    const response = await fetch(`/api/planning/sessions/${session.id}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledDate: session.scheduledDate }),
    });
    if (!response.ok) setNotice(await responseError(response));
    else {
      await loadWeek(week.weekStart);
      setNotice("Einheit dupliziert. Du kannst die Kopie jetzt bearbeiten oder verschieben.");
    }
  }

  async function duplicateWeek() {
    const targetWeekStart = addDays(week.weekStart, 7);
    const targetLabel = `${dateLabel(targetWeekStart, { day: "numeric", month: "short" })} – ${dateLabel(addDays(targetWeekStart, 6), { day: "numeric", month: "short", year: "numeric" })}`;
    if (!window.confirm(`Diese Woche nach ${targetLabel} kopieren? Ausgefallene Einheiten werden nicht übernommen.`)) return;
    setDuplicating(true);
    setNotice(null);
    try {
      const response = await fetch("/api/planning/week/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceWeekStart: week.weekStart, targetWeekStart }),
      });
      if (!response.ok) throw new Error(await responseError(response));
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

  async function decideMatch(match: PlanningWorkoutMatch, status: "confirmed" | "rejected") {
    setNotice(null);
    const response = await fetch(`/api/planning/sessions/${match.plannedSessionId}/matches`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workoutId: match.workoutId, status, score: match.score, reasons: match.reasons }),
    });
    if (!response.ok) setNotice(await responseError(response));
    else { await loadMatches(week.weekStart); setNotice(status === "confirmed" ? "Aktivität dem Plan bestätigt zugeordnet." : "Vorschlag abgelehnt."); }
  }

  async function removeMatch(match: PlanningWorkoutMatch) {
    const response = await fetch(`/api/planning/sessions/${match.plannedSessionId}/matches/${match.workoutId}`, { method: "DELETE" });
    if (!response.ok) setNotice(await responseError(response));
    else { await loadMatches(week.weekStart); setNotice("Zuordnung entfernt."); }
  }

  async function openReflection(match: PlanningWorkoutMatch) {
    const saved = match.reflection;
    setReviewImported({ rpe: match.workout.importedRpe, feel: match.workout.importedFeel });
    setReflectionModal(saved ? {
      plannedSessionId: match.plannedSessionId,
      workoutId: match.workoutId,
      feeling: saved.feeling ?? feelingFromGarmin(match.workout.importedFeel) ?? "",
      perceivedExertion: (saved.perceivedExertion ?? match.workout.importedRpe)?.toString() ?? "",
      deviationReason: saved.deviationReason ?? "",
      note: saved.note,
    } : {
      plannedSessionId: match.plannedSessionId,
      workoutId: match.workoutId,
      feeling: feelingFromGarmin(match.workout.importedFeel) ?? "",
      perceivedExertion: match.workout.importedRpe?.toString() ?? "",
      deviationReason: "",
      note: "",
    });
    setReviewLog({ pain: [], injury: false, soreness: null, rpe: null, notes: "" });
    setNewPainBodyPart("");
    if (match.workout.externalId) {
      setReviewLogLoading(true);
      try {
        const [logResponse, detailResponse] = await Promise.all([
          fetch(`/api/training/${match.workout.externalId}/log`),
          fetch(`/api/training/${match.workout.externalId}/details`),
        ]);
        if (logResponse.ok) {
          const existing = await logResponse.json();
          if (existing) setReviewLog({ pain: existing.pain ?? [], injury: existing.injury ?? false, soreness: existing.soreness ?? null, rpe: existing.rpe ?? null, notes: existing.notes ?? "" });
        }
        if (detailResponse.ok) {
          const details = await detailResponse.json();
          const importedRpe = details?.importedLog?.rpe ?? match.workout.importedRpe;
          const importedFeel = details?.importedLog?.feel ?? match.workout.importedFeel;
          setReviewImported({ rpe: importedRpe, feel: importedFeel });
          setReflectionModal((current) => current ? {
            ...current,
            feeling: saved?.feeling ?? feelingFromGarmin(importedFeel) ?? current.feeling,
            perceivedExertion: (saved?.perceivedExertion ?? importedRpe)?.toString() ?? current.perceivedExertion,
          } : current);
        }
      } finally {
        setReviewLogLoading(false);
      }
    }
  }

  async function saveReflection(event: FormEvent) {
    event.preventDefault();
    if (!reflectionModal) return;
    setReflectionSaving(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/planning/sessions/${reflectionModal.plannedSessionId}/matches/${reflectionModal.workoutId}/reflection`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feeling: feelingFromGarmin(reviewImported.feel) ?? (reflectionModal.feeling || null),
          perceivedExertion: reviewImported.rpe ?? (reflectionModal.perceivedExertion ? Number(reflectionModal.perceivedExertion) : null),
          deviationReason: reflectionModal.deviationReason || null,
          note: reflectionModal.note,
        }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const matchedWorkout = matches.find((match) => match.plannedSessionId === reflectionModal.plannedSessionId && match.workoutId === reflectionModal.workoutId)?.workout;
      if (matchedWorkout?.externalId) {
        const logResponse = await fetch(`/api/training/${matchedWorkout.externalId}/log`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...reviewLog, date: matchedWorkout.startedAt.slice(0, 10) }),
        });
        if (!logResponse.ok) throw new Error(await responseError(logResponse));
      }
      setReflectionModal(null);
      await loadMatches(week.weekStart);
      setNotice("Reflexion gespeichert.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Die Reflexion konnte nicht gespeichert werden.");
    } finally {
      setReflectionSaving(false);
    }
  }

  function addReviewPain() {
    const bodyPart = newPainBodyPart.trim();
    if (!bodyPart) return;
    setReviewLog((current) => ({ ...current, pain: [...current.pain, { bodyPart, intensity: 5 }] }));
    setNewPainBodyPart("");
  }

  async function saveRegatta(event: FormEvent) {
    event.preventDefault();
    if (!regattaModal) return;
    setRegattaSaving(true);
    setNotice(null);
    let created: CompetitionResult | null = null;
    try {
      const competitionResponse = await fetch("/api/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...regattaModal, distanceMeters: Number(regattaModal.distanceMeters) || 2000, status: "planned" }),
      });
      if (!competitionResponse.ok) throw new Error(await responseError(competitionResponse));
      const createdCompetition = (await competitionResponse.json()) as CompetitionResult;
      created = createdCompetition;
      const sessionResponse = await fetch("/api/planning/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledDate: createdCompetition.date,
          title: createdCompetition.name,
          sportType: "Regatta",
          plannedDurationMin: null,
          plannedIntensity: "competition",
          timeOfDay: "custom",
          description: [createdCompetition.location, createdCompetition.distanceMeters ? `${createdCompetition.distanceMeters} m` : "", createdCompetition.goal].filter(Boolean).join(" · "),
          raceId: createdCompetition.id,
        }),
      });
      if (!sessionResponse.ok) throw new Error(await responseError(sessionResponse));
      setCompetitions((current) => [createdCompetition, ...current]);
      setRegattaModal(null);
      const targetWeek = mondayForDate(createdCompetition.date);
      await loadWeek(targetWeek);
      setNotice(`Regatta „${createdCompetition.name}“ geplant und mit der Trainingswoche verknüpft.`);
    } catch (error) {
      if (created) await fetch("/api/competitions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: created.id }) });
      setNotice(error instanceof Error ? error.message : "Die Regatta konnte nicht geplant werden.");
    } finally {
      setRegattaSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-accent-soft via-surface to-surface p-5 md:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-center gap-3">
          <button aria-label="Vorherige Woche" onClick={() => loadWeek(addDays(week.weekStart, -7))} className="rounded-lg border border-border p-2 text-muted hover:bg-surface-raised hover:text-foreground"><ChevronLeft size={18} /></button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Diese Trainingswoche</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{dateLabel(week.weekStart, { day: "numeric", month: "short" })} – {dateLabel(addDays(week.weekStart, 6), { day: "numeric", month: "short", year: "numeric" })}</h2>
            <p className="mt-2 text-sm text-muted">{focus || "Lege einen Fokus fest, damit jede Einheit auf dasselbe Ziel einzahlt."}</p>
          </div>
          <button aria-label="Nächste Woche" onClick={() => loadWeek(addDays(week.weekStart, 7))} className="rounded-lg border border-border p-2 text-muted hover:bg-surface-raised hover:text-foreground"><ChevronRight size={18} /></button>
          {loading && <LoaderCircle size={18} className="animate-spin text-accent" />}
        </div>
        <div className="flex flex-wrap gap-2 text-sm sm:gap-3">
          <div className="rounded-xl border border-border/80 bg-background/35 px-4 py-2.5"><span className="text-muted">Geplant</span><strong className="ml-2 text-lg">{plannedCount}</strong></div>
          <div className="rounded-xl border border-border/80 bg-background/35 px-4 py-2.5"><span className="text-muted">Erledigt</span><strong className="ml-2 text-lg text-positive">{completedCount}</strong></div>
          <div className="rounded-xl border border-border/80 bg-background/35 px-4 py-2.5"><span className="text-muted">Umfang</span><strong className="ml-2 text-lg">{minutesLabel(week.plannedDurationMin)}</strong></div>
          <button onClick={duplicateWeek} disabled={duplicating || plannedCount === 0} className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 font-semibold text-muted hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40">{duplicating ? <LoaderCircle size={17} className="animate-spin" /> : <Copy size={17} />} Woche kopieren</button>
          <button onClick={() => setRegattaModal({ ...EMPTY_REGATTA, date: week.weekStart })} title={`${competitions.length} geplante Regatta${competitions.length === 1 ? "" : "en"}`} className="flex items-center gap-2 rounded-xl border border-fuchsia-400/40 px-4 py-2 font-semibold text-fuchsia-300 hover:bg-fuchsia-400/10"><Trophy size={17} /> Regatta planen</button>
          <button onClick={() => setModal(emptyDraft(week.weekStart))} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 font-semibold text-black hover:opacity-90"><Plus size={17} /> Einheit planen</button>
        </div>
        </div>
      </section>

      {notice && <div className={clsx("rounded-xl border px-4 py-3 text-sm", notice.includes("gespeichert") || notice.includes("dupliziert") ? "border-positive/30 bg-positive/10 text-positive" : "border-warning/30 bg-warning/10 text-warning")}>{notice}</div>}

      <section className="grid gap-3 rounded-2xl border border-border/80 bg-surface/70 p-4 lg:grid-cols-[1fr_220px_auto] lg:items-end">
        {editingFocus || focus ? <label className="text-sm"><span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">Fokus dieser Woche</span><input autoFocus={editingFocus && !focus} value={focus} onChange={(event) => setFocus(event.target.value)} placeholder="Was soll diese Woche bewirken?" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent" /></label> : <button onClick={() => setEditingFocus(true)} className="flex items-center gap-2 self-end rounded-xl border border-dashed border-border px-4 py-2.5 text-left text-sm font-semibold text-muted hover:border-accent/40 hover:text-accent"><Plus size={16} /> Wochenfokus hinzufügen</button>}
        <label className="text-sm"><span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">Wochentyp</span><select value={weekType} onChange={(event) => setWeekType(event.target.value as PlanningWeekType)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent">{WEEK_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
        <button onClick={saveWeekContext} disabled={savingContext} className="flex items-center justify-center gap-2 rounded-xl border border-accent/40 px-4 py-2.5 text-sm font-semibold text-accent hover:bg-accent-soft disabled:opacity-50">{savingContext ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />} Speichern</button>
      </section>

      <section className="rounded-2xl border border-border/80 bg-surface/70 p-4 md:p-5">
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-sm font-semibold">Wochenrhythmus</p><p className="mt-1 text-xs text-muted">Geplanter Umfang und Intensität – Erholungstage bleiben bewusst sichtbar.</p></div><div className="hidden items-center gap-3 text-[10px] text-muted sm:flex"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-positive" /> locker</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-warning" /> moderat</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-orange-400" /> hart</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-muted" /> offen</span></div></div>
        <div className="grid h-24 grid-cols-7 items-end gap-2">
          {dayLoads.map((day) => {
            const intensity = INTENSITIES.find((item) => item.value === day.strongest);
            const height = day.score === 0 ? 4 : Math.max(18, Math.round((day.score / maxDayLoad) * 64));
            return <div key={day.day} className="flex h-full min-w-0 flex-col items-center justify-end gap-1" title={day.sessions ? `${day.sessions} Einheit${day.sessions === 1 ? "" : "en"}` : "Erholungstag"}><div className={clsx("w-full max-w-12 rounded-t-lg transition-all", day.score === 0 ? "bg-border" : intensity?.color ?? "bg-muted")} style={{ height }} /><p className="text-[10px] font-semibold uppercase text-muted">{dateLabel(day.day, { weekday: "narrow" })}</p></div>;
          })}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {days.map((day) => {
          const sessions = week.sessions.filter((session) => session.scheduledDate === day);
          const isToday = day === new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
          return (
            <article key={day} className={clsx("group/day min-h-52 rounded-2xl border p-3 transition-colors", isToday ? "border-accent/60 bg-gradient-to-b from-accent-soft to-surface shadow-[0_0_28px_rgba(37,216,207,0.06)]" : "border-border bg-surface hover:border-border/80")}>
              <div className="mb-3 flex items-start justify-between border-b border-border pb-3">
                <div><p className={clsx("text-xs font-semibold uppercase tracking-wide", isToday ? "text-accent" : "text-muted")}>{dateLabel(day, { weekday: "long" })}</p><p className="mt-0.5 font-semibold">{dateLabel(day, { day: "2-digit", month: "2-digit" })}{isToday ? " · Heute" : ""}</p></div>
                <button aria-label={`Einheit am ${day} planen`} onClick={() => setModal(emptyDraft(day))} className="rounded-lg p-1.5 text-muted hover:bg-accent-soft hover:text-accent"><Plus size={16} /></button>
              </div>
              <div className="space-y-2">
                {sessions.map((session) => {
                  const intensity = INTENSITIES.find((item) => item.value === session.plannedIntensity);
                  const sessionMatches = matches.filter((match) => match.plannedSessionId === session.id);
                  return (
                    <div key={session.id} className={clsx("group rounded-xl border border-border bg-surface-raised p-3", session.status === "cancelled" && "opacity-55")}>
                      <div className="flex items-start gap-2">{session.raceId ? <Trophy size={15} className="mt-0.5 shrink-0 text-fuchsia-300" /> : <span className={clsx("mt-1.5 h-2 w-2 shrink-0 rounded-full", intensity?.color ?? "bg-muted")} />}<div className="min-w-0 flex-1"><p className={clsx("text-sm font-semibold leading-snug", session.status === "cancelled" && "line-through")}>{session.title}</p><p className={clsx("mt-1 text-xs", session.raceId ? "font-semibold text-fuchsia-300" : "text-muted")}>{session.raceId ? "Regatta" : session.sportType}{session.plannedDurationMin ? ` · ${session.plannedDurationMin} min` : ""}</p></div></div>
                      <div className="mt-3 flex items-center gap-1 border-t border-border pt-2 opacity-100 transition-opacity xl:opacity-0 xl:group-hover:opacity-100 xl:group-focus-within:opacity-100">
                        <button aria-label="Bearbeiten" onClick={() => editSession(session)} className="rounded p-1 text-muted hover:text-accent"><Pencil size={14} /></button>
                        <button aria-label="Einheit duplizieren" onClick={() => duplicateSession(session)} className="rounded p-1 text-muted hover:text-accent"><Copy size={14} /></button>
                        <button aria-label={session.status === "cancelled" ? "Wieder einplanen" : "Als ausgefallen markieren"} onClick={() => updateStatus(session, session.status === "cancelled" ? "planned" : "cancelled")} className="rounded p-1 text-muted hover:text-warning">{session.status === "cancelled" ? <RotateCcw size={14} /> : <CircleOff size={14} />}</button>
                        <button aria-label="Löschen" onClick={() => removeSession(session)} className="ml-auto rounded p-1 text-muted hover:text-negative"><Trash2 size={14} /></button>
                      </div>
                      {sessionMatches.length > 0 && <button onClick={() => setDetailSessionId(session.id)} className={clsx("mt-3 flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-semibold", sessionMatches.some((match) => match.status === "confirmed") ? "border-positive/30 bg-positive/10 text-positive" : "border-accent/25 bg-accent-soft text-accent")}>
                        {sessionMatches.some((match) => match.status === "confirmed") ? <CheckCircle2 size={14} /> : <Sparkles size={14} />}
                        <span className="min-w-0 flex-1 truncate">{sessionMatches.some((match) => match.status === "confirmed") ? "Details ansehen" : "Zuordnung prüfen"}</span>
                        <ChevronRight size={14} />
                      </button>}
                    </div>
                  );
                })}
                {sessions.length === 0 && <button onClick={() => setModal(emptyDraft(day))} className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border py-6 text-xs text-muted hover:border-accent/40 hover:text-accent"><CalendarDays size={18} /> Noch frei</button>}
              </div>
            </article>
          );
        })}
      </section>

      {regattaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={(event) => event.target === event.currentTarget && setRegattaModal(null)}>
          <form onSubmit={saveRegatta} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-fuchsia-400/30 bg-surface p-5 shadow-2xl sm:p-7">
            <div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-fuchsia-300">Wettkampf planen</p><h2 className="mt-2 text-2xl font-semibold">Neue Regatta</h2><p className="mt-1 text-sm text-muted">Die Regatta wird automatisch als Wettkampf-Einheit mit deiner Trainingswoche verbunden.</p></div><button type="button" aria-label="Schließen" onClick={() => setRegattaModal(null)} className="rounded-full border border-border p-2 text-muted hover:text-foreground"><X size={18} /></button></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2"><span className="mb-1.5 block text-muted">Name der Regatta</span><input required autoFocus value={regattaModal.name} onChange={(event) => setRegattaModal({ ...regattaModal, name: event.target.value })} placeholder="z. B. Münchner Regatta" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-fuchsia-400" /></label>
              <label className="text-sm"><span className="mb-1.5 block text-muted">Datum</span><input required type="date" value={regattaModal.date} onChange={(event) => setRegattaModal({ ...regattaModal, date: event.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-fuchsia-400" /></label>
              <label className="text-sm"><span className="mb-1.5 block text-muted">Ort</span><input value={regattaModal.location} onChange={(event) => setRegattaModal({ ...regattaModal, location: event.target.value })} placeholder="Ort oder Gewässer" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-fuchsia-400" /></label>
              <label className="text-sm"><span className="mb-1.5 block text-muted">Strecke</span><div className="relative"><input type="number" min="100" value={regattaModal.distanceMeters} onChange={(event) => setRegattaModal({ ...regattaModal, distanceMeters: event.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pr-10 outline-none focus:border-fuchsia-400" /><span className="absolute right-3 top-2.5 text-sm text-muted">m</span></div></label>
              <label className="text-sm"><span className="mb-1.5 block text-muted">Bootsklasse</span><input value={regattaModal.boatClass} onChange={(event) => setRegattaModal({ ...regattaModal, boatClass: event.target.value })} placeholder="z. B. 1x, 2x, 4-" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-fuchsia-400" /></label>
              <label className="text-sm sm:col-span-2"><span className="mb-1.5 block text-muted">Mannschaft</span><input value={regattaModal.crew} onChange={(event) => setRegattaModal({ ...regattaModal, crew: event.target.value })} placeholder="Optional" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-fuchsia-400" /></label>
              <label className="text-sm sm:col-span-2"><span className="mb-1.5 block text-muted">Ziel für die Regatta</span><textarea rows={3} value={regattaModal.goal} onChange={(event) => setRegattaModal({ ...regattaModal, goal: event.target.value })} placeholder="Was möchtest du bei dieser Regatta erreichen?" className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-fuchsia-400" /></label>
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setRegattaModal(null)} className="rounded-xl px-4 py-2.5 text-sm text-muted hover:text-foreground">Abbrechen</button><button disabled={regattaSaving} className="flex items-center gap-2 rounded-xl bg-fuchsia-400 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50">{regattaSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Trophy size={16} />} Regatta einplanen</button></div>
          </form>
        </div>
      )}

      {detailSession && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onMouseDown={(event) => event.target === event.currentTarget && setDetailSessionId(null)}>
          <aside className="h-full w-full overflow-y-auto border-l border-border bg-surface p-5 shadow-2xl sm:max-w-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Einheit im Detail</p><h2 className="mt-2 text-2xl font-semibold">{detailSession.title}</h2><p className="mt-1 text-sm text-muted">{dateLabel(detailSession.scheduledDate, { weekday: "long", day: "numeric", month: "long" })} · {detailSession.sportType}{detailSession.plannedDurationMin ? ` · ${detailSession.plannedDurationMin} Minuten` : ""}</p></div>
              <button aria-label="Schließen" onClick={() => setDetailSessionId(null)} className="rounded-full border border-border p-2 text-muted hover:text-foreground"><X size={19} /></button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => { editSession(detailSession); setDetailSessionId(null); }} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted hover:text-accent"><Pencil size={15} /> Plan bearbeiten</button><button onClick={() => duplicateSession(detailSession)} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted hover:text-accent"><Copy size={15} /> Duplizieren</button></div>

            <div className="mt-7 space-y-4">
              {detailMatches.length === 0 && <div className="rounded-2xl border border-dashed border-border p-6 text-center"><CalendarDays size={24} className="mx-auto text-muted" /><p className="mt-3 font-semibold">Noch keine Garmin-Aktivität zugeordnet</p><p className="mt-1 text-sm text-muted">Sobald SportLog eine passende Aktivität findet, kannst du sie hier bestätigen.</p></div>}
              {detailMatches.map((match) => {
                const actualMinutes = match.workout.durationSeconds ? Math.round(match.workout.durationSeconds / 60) : null;
                const deviationMinutes = detailSession.plannedDurationMin !== null && actualMinutes !== null ? actualMinutes - detailSession.plannedDurationMin : null;
                const savedReflection = match.reflection;
                const adaptation = match.status === "confirmed" ? adaptationFor(match) : null;
                const nextSession = adaptation ? week.sessions.filter((candidate) => candidate.status !== "cancelled" && candidate.scheduledDate > detailSession.scheduledDate).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0] : null;
                return <section key={match.workoutId} className={clsx("rounded-2xl border p-4 sm:p-5", match.status === "confirmed" ? "border-positive/30 bg-positive/5" : "border-accent/30 bg-accent-soft")}>
                  <div className="flex items-start gap-3">{match.status === "confirmed" ? <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-positive" /> : <Sparkles size={20} className="mt-0.5 shrink-0 text-accent" />}<div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-muted">{match.status === "confirmed" ? "Garmin zugeordnet" : `${Math.round(match.score * 100)} % Übereinstimmung`}</p><h3 className="mt-1 text-lg font-semibold">{match.workout.title}</h3><p className="mt-1 text-sm text-muted">{new Date(match.workout.startedAt).toLocaleDateString("de-DE")}{actualMinutes ? ` · ${actualMinutes} Minuten` : ""}</p></div></div>
                  {match.status === "confirmed" && deviationMinutes !== null && <div className="mt-5 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-background/45 p-3 text-center"><div><p className="text-[10px] uppercase tracking-wide text-muted">Geplant</p><p className="mt-1 font-semibold">{detailSession.plannedDurationMin} min</p></div><div><p className="text-[10px] uppercase tracking-wide text-muted">Tatsächlich</p><p className="mt-1 font-semibold text-accent">{actualMinutes} min</p></div><div><p className="text-[10px] uppercase tracking-wide text-muted">Abweichung</p><p className={clsx("mt-1 font-semibold", deviationMinutes === 0 ? "text-positive" : "text-warning")}>{deviationMinutes > 0 ? "+" : ""}{deviationMinutes} min</p></div></div>}
                  <div className="mt-4 flex flex-wrap gap-2">{match.status === "suggested" ? <><button onClick={() => decideMatch(match, "confirmed")} className="rounded-xl bg-positive/15 px-3 py-2 text-sm font-semibold text-positive">Zuordnung bestätigen</button><button onClick={() => decideMatch(match, "rejected")} className="rounded-xl px-3 py-2 text-sm text-muted hover:text-foreground">Nicht passend</button></> : <><button onClick={() => openReflection(match)} className="flex items-center gap-2 rounded-xl bg-accent/10 px-3 py-2 text-sm font-semibold text-accent"><MessageSquareText size={15} />{savedReflection ? "Reflexion bearbeiten" : "Training reflektieren"}</button><button onClick={() => removeMatch(match)} className="rounded-xl px-3 py-2 text-sm text-muted hover:text-negative">Zuordnung lösen</button></>}</div>
                  {savedReflection && <p className="mt-4 text-sm text-positive">Reflexion gespeichert{savedReflection.perceivedExertion ? ` · RPE ${savedReflection.perceivedExertion}/10` : ""}</p>}
                  {adaptation && <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-4"><div className="flex gap-3"><Lightbulb size={18} className="mt-0.5 shrink-0 text-warning" /><div><p className="font-semibold text-warning">{adaptation.title}</p><p className="mt-1 text-sm text-muted">{adaptation.reason} SportLog ändert nichts automatisch.</p></div></div>{nextSession ? <button onClick={() => reviewAdaptation(nextSession, adaptation)} className="mt-3 rounded-lg bg-warning/15 px-3 py-2 text-sm font-semibold text-warning">Vorschlag für {nextSession.title} prüfen</button> : <p className="mt-3 text-sm text-muted">Keine spätere Einheit in dieser Woche geplant.</p>}</div>}
                </section>;
              })}
            </div>
          </aside>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}>
          <form onSubmit={saveSession} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-accent">{modal.id ? "Einheit bearbeiten" : "Neue Einheit"}</p><h2 className="mt-1 text-xl font-semibold">Training planen</h2></div><button type="button" aria-label="Schließen" onClick={() => setModal(null)} className="text-muted hover:text-foreground"><X size={20} /></button></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2"><span className="mb-1.5 block text-muted">Titel</span><input required autoFocus value={modal.title} onChange={(event) => setModal({ ...modal, title: event.target.value })} placeholder="z. B. Grundlagenausdauer" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent" /></label>
              <label className="text-sm"><span className="mb-1.5 block text-muted">Datum</span><input required type="date" value={modal.scheduledDate} onChange={(event) => setModal({ ...modal, scheduledDate: event.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent" /></label>
              <label className="text-sm"><span className="mb-1.5 block text-muted">Sportart</span><select value={modal.sportType} onChange={(event) => setModal({ ...modal, sportType: event.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent">{SPORT_OPTIONS.map((sport) => <option key={sport}>{sport}</option>)}</select></label>
              <label className="text-sm"><span className="mb-1.5 block text-muted">Dauer in Minuten</span><input type="number" min="1" max="1440" value={modal.plannedDurationMin} onChange={(event) => setModal({ ...modal, plannedDurationMin: event.target.value })} placeholder="60" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent" /></label>
              <label className="text-sm"><span className="mb-1.5 block text-muted">Intensität</span><select value={modal.plannedIntensity} onChange={(event) => setModal({ ...modal, plannedIntensity: event.target.value as PlanningIntensity })} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent"><option value="">Nicht festgelegt</option>{INTENSITIES.map((intensity) => <option key={intensity.value} value={intensity.value}>{intensity.label}</option>)}</select></label>
              <label className="text-sm sm:col-span-2"><span className="mb-1.5 block text-muted">Tageszeit</span><select value={modal.timeOfDay} onChange={(event) => setModal({ ...modal, timeOfDay: event.target.value as SessionDraft["timeOfDay"] })} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent"><option value="morning">Morgens</option><option value="midday">Mittags</option><option value="afternoon">Nachmittags</option><option value="evening">Abends</option><option value="custom">Flexibel</option></select></label>
              <label className="text-sm sm:col-span-2"><span className="mb-1.5 block text-muted">Beschreibung oder Fokus</span><textarea rows={3} value={modal.description} onChange={(event) => setModal({ ...modal, description: event.target.value })} className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent" /></label>
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setModal(null)} className="rounded-xl px-4 py-2.5 text-sm text-muted hover:text-foreground">Abbrechen</button><button disabled={modalSaving} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50">{modalSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Clock3 size={16} />}{modal.id ? "Änderungen speichern" : "Einheit einplanen"}</button></div>
          </form>
        </div>
      )}

      {reflectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={(event) => event.target === event.currentTarget && setReflectionModal(null)}>
          <form onSubmit={saveReflection} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-accent">Nach dem Training</p><h2 className="mt-1 text-xl font-semibold">Wie lief deine Einheit?</h2><p className="mt-1 text-sm text-muted">Kurz festhalten, was Zahlen allein nicht erklären.</p></div><button type="button" aria-label="Schließen" onClick={() => setReflectionModal(null)} className="text-muted hover:text-foreground"><X size={20} /></button></div>
            <div className="space-y-5">
              {(reviewImported.rpe !== null || reviewImported.feel !== null) && <div className="rounded-xl border border-accent/30 bg-accent-soft p-3"><div className="flex items-center justify-between"><p className="text-xs font-semibold">Von deiner Uhr übernommen</p><span className="text-[11px] text-accent">Garmin · schreibgeschützt</span></div><div className="mt-2 grid grid-cols-2 gap-3 text-sm">{reviewImported.rpe !== null && <div><p className="text-xs text-muted">Belastung</p><p className="font-semibold">RPE {reviewImported.rpe}/10</p></div>}{reviewImported.feel !== null && <div><p className="text-xs text-muted">Trainingsgefühl</p><p className="font-semibold">{reviewImported.feel}/100</p></div>}</div></div>}
              {reviewImported.feel == null && <fieldset><legend className="mb-2 text-sm text-muted">Wie hast du dich gefühlt?</legend><div className="grid grid-cols-5 gap-2">{([['great', 'Sehr gut'], ['good', 'Gut'], ['okay', 'Okay'], ['hard', 'Schwer'], ['bad', 'Schlecht']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setReflectionModal({ ...reflectionModal, feeling: value })} className={clsx("rounded-xl border px-2 py-2 text-xs", reflectionModal.feeling === value ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-foreground")}>{label}</button>)}</div></fieldset>}
              {reviewImported.rpe == null && <label className="block text-sm"><span className="mb-1.5 block text-muted">Empfundene Belastung (RPE 1–10)</span><input type="number" min="1" max="10" value={reflectionModal.perceivedExertion} onChange={(event) => setReflectionModal({ ...reflectionModal, perceivedExertion: event.target.value })} placeholder="z. B. 7" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent" /></label>}
              <div><div className="mb-2 flex items-center justify-between"><p className="text-sm text-muted">Schmerzen oder Beschwerden</p>{reviewLogLoading && <LoaderCircle size={15} className="animate-spin text-accent" />}</div><div className="space-y-2">{reviewLog.pain.map((pain, index) => <div key={`${pain.bodyPart}-${index}`} className="grid grid-cols-[1fr_90px_auto] items-center gap-2"><span className="text-sm">{pain.bodyPart}</span><input aria-label={`Schmerzstärke ${pain.bodyPart}`} type="number" min="0" max="10" value={pain.intensity} onChange={(event) => setReviewLog((current) => ({ ...current, pain: current.pain.map((item, itemIndex) => itemIndex === index ? { ...item, intensity: Number(event.target.value) } : item) }))} className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent" /><button type="button" aria-label={`${pain.bodyPart} entfernen`} onClick={() => setReviewLog((current) => ({ ...current, pain: current.pain.filter((_, itemIndex) => itemIndex !== index) }))} className="text-muted hover:text-negative"><X size={15} /></button></div>)}</div><div className="mt-2 flex gap-2"><input value={newPainBodyPart} onChange={(event) => setNewPainBodyPart(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addReviewPain(); } }} placeholder="z. B. Knie rechts" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent" /><button type="button" onClick={addReviewPain} className="rounded-xl border border-accent/40 px-3 text-accent"><Plus size={16} /></button></div></div>
              <label className="flex items-center justify-between text-sm"><span className="text-muted">Verletzungsverdacht</span><input type="checkbox" checked={reviewLog.injury} onChange={(event) => setReviewLog((current) => ({ ...current, injury: event.target.checked }))} className="h-4 w-4 accent-accent" /></label>
              <label className="block text-sm"><span className="mb-1.5 block text-muted">Muskelkater (0–10)</span><input type="number" min="0" max="10" value={reviewLog.soreness ?? ""} onChange={(event) => setReviewLog((current) => ({ ...current, soreness: event.target.value ? Number(event.target.value) : null }))} placeholder="0" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent" /></label>
              <label className="block text-sm"><span className="mb-1.5 block text-muted">Warum wich das Training vom Plan ab?</span><select value={reflectionModal.deviationReason} onChange={(event) => setReflectionModal({ ...reflectionModal, deviationReason: event.target.value as TrainingDeviationReason | "" })} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent"><option value="">Kein Grund ausgewählt</option><option value="felt-good">Ich fühlte mich stärker als erwartet</option><option value="felt-tired">Ich war müder als erwartet</option><option value="schedule">Zeit oder Alltag</option><option value="conditions">Bedingungen oder Material</option><option value="plan-adjustment">Plan bewusst angepasst</option><option value="other">Anderer Grund</option></select></label>
              <label className="block text-sm"><span className="mb-1.5 block text-muted">Kurze Notiz (optional)</span><textarea rows={3} maxLength={1000} value={reflectionModal.note} onChange={(event) => setReflectionModal({ ...reflectionModal, note: event.target.value })} placeholder="Was möchtest du für die nächste Einheit festhalten?" className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent" /></label>
            </div>
            <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setReflectionModal(null)} className="rounded-xl px-4 py-2.5 text-sm text-muted hover:text-foreground">Abbrechen</button><button disabled={reflectionSaving} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50">{reflectionSaving && <LoaderCircle size={16} className="animate-spin" />}Reflexion speichern</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
