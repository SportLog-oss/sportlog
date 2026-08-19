"use client";

import { FormEvent, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, LoaderCircle, Plus, Save, Trophy } from "lucide-react";
import clsx from "clsx";
import { addDays, mondayForDate, type PlanningWeek, type PlanningWeekType, type PlanningWorkoutMatch } from "@/lib/planning";
import type { CompetitionResult } from "@/lib/types";
import { SessionEditorDialog } from "@/components/planning/SessionEditorDialog";
import { ReflectionDialog, type ImportedReflection, type ReflectionDraft, type ReflectionReviewLog } from "@/components/planning/ReflectionDialog";
import { SessionDetailDrawer } from "@/components/planning/SessionDetailDrawer";
import { emptyRegattaDraft, RegattaDialog, type RegattaDraft } from "@/components/planning/RegattaDialog";
import { WeekSchedule } from "@/components/planning/WeekSchedule";
import { planningResponseError, usePlanningWeekController } from "@/components/planning/usePlanningWeekController";
import { usePlanningSessionController } from "@/components/planning/usePlanningSessionController";
import {
  buildMatchDecisionPayload,
  buildPlanningDayLoads,
  buildRegattaCompetitionPayload,
  buildRegattaSessionPayload,
  buildReflectionDraft,
  buildReflectionPayload,
  INTENSITIES,
  planningDateLabel,
  planningMinutesLabel,
  trainingFeelingFromScore,
  WEEK_TYPES,
} from "@/lib/planningPresentation";

export function WeekPlanner({ initialWeek, initialMatches, initialCompetitions }: { initialWeek: PlanningWeek; initialMatches: PlanningWorkoutMatch[]; initialCompetitions: CompetitionResult[] }) {
  const {
    week, matches, loading, savingContext, duplicating, focus, setFocus,
    editingFocus, setEditingFocus, weekType, setWeekType, notice, setNotice,
    loadMatches, loadWeek, saveWeekContext, duplicateWeek,
  } = usePlanningWeekController(initialWeek, initialMatches);
  const { modal, setModal, modalSaving, planSession, editSession, reviewAdaptation, saveSession, updateStatus, removeSession, duplicateSession } = usePlanningSessionController({ weekStart: week.weekStart, reloadWeek: loadWeek, setNotice });
  const [reflectionModal, setReflectionModal] = useState<ReflectionDraft | null>(null);
  const [reflectionSaving, setReflectionSaving] = useState(false);
  const [reviewLog, setReviewLog] = useState<ReflectionReviewLog>({ pain: [], injury: false, soreness: null, rpe: null, notes: "" });
  const [reviewLogLoading, setReviewLogLoading] = useState(false);
  const [newPainBodyPart, setNewPainBodyPart] = useState("");
  const [reviewImported, setReviewImported] = useState<ImportedReflection>({ rpe: null, feel: null });
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
  const [competitions, setCompetitions] = useState(initialCompetitions);
  const [regattaModal, setRegattaModal] = useState<RegattaDraft | null>(null);
  const [regattaSaving, setRegattaSaving] = useState(false);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(week.weekStart, index)), [week.weekStart]);
  const activeSessions = week.sessions.filter((session) => session.status !== "cancelled");
  const plannedCount = activeSessions.length;
  const completedCount = new Set(matches.filter((match) => match.status === "confirmed").map((match) => match.plannedSessionId)).size;
  const dayLoads = buildPlanningDayLoads(days, week.sessions);
  const maxDayLoad = Math.max(1, ...dayLoads.map((day) => day.score));
  const detailSession = detailSessionId ? week.sessions.find((session) => session.id === detailSessionId) ?? null : null;
  const detailMatches = detailSession ? matches.filter((match) => match.plannedSessionId === detailSession.id) : [];

  async function decideMatch(match: PlanningWorkoutMatch, status: "confirmed" | "rejected") {
    setNotice(null);
    const response = await fetch(`/api/planning/sessions/${match.plannedSessionId}/matches`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildMatchDecisionPayload(match, status)),
    });
    if (!response.ok) setNotice(await planningResponseError(response));
    else { await loadMatches(week.weekStart); setNotice(status === "confirmed" ? "Aktivität dem Plan bestätigt zugeordnet." : "Vorschlag abgelehnt."); }
  }

  async function removeMatch(match: PlanningWorkoutMatch) {
    const response = await fetch(`/api/planning/sessions/${match.plannedSessionId}/matches/${match.workoutId}`, { method: "DELETE" });
    if (!response.ok) setNotice(await planningResponseError(response));
    else { await loadMatches(week.weekStart); setNotice("Zuordnung entfernt."); }
  }

  async function openReflection(match: PlanningWorkoutMatch) {
    const saved = match.reflection;
    setReviewImported({ rpe: match.workout.importedRpe, feel: match.workout.importedFeel });
    setReflectionModal(buildReflectionDraft(match, saved));
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
            feeling: saved?.feeling ?? trainingFeelingFromScore(importedFeel) ?? current.feeling,
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
        body: JSON.stringify(buildReflectionPayload(reflectionModal, reviewImported)),
      });
      if (!response.ok) throw new Error(await planningResponseError(response));
      const matchedWorkout = matches.find((match) => match.plannedSessionId === reflectionModal.plannedSessionId && match.workoutId === reflectionModal.workoutId)?.workout;
      if (matchedWorkout?.externalId) {
        const logResponse = await fetch(`/api/training/${matchedWorkout.externalId}/log`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...reviewLog, date: matchedWorkout.startedAt.slice(0, 10) }),
        });
        if (!logResponse.ok) throw new Error(await planningResponseError(logResponse));
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
        body: JSON.stringify(buildRegattaCompetitionPayload(regattaModal)),
      });
      if (!competitionResponse.ok) throw new Error(await planningResponseError(competitionResponse));
      const createdCompetition = (await competitionResponse.json()) as CompetitionResult;
      created = createdCompetition;
      const sessionResponse = await fetch("/api/planning/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRegattaSessionPayload(createdCompetition)),
      });
      if (!sessionResponse.ok) throw new Error(await planningResponseError(sessionResponse));
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
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{planningDateLabel(week.weekStart, { day: "numeric", month: "short" })} – {planningDateLabel(addDays(week.weekStart, 6), { day: "numeric", month: "short", year: "numeric" })}</h2>
            <p className="mt-2 text-sm text-muted">{focus || "Lege einen Fokus fest, damit jede Einheit auf dasselbe Ziel einzahlt."}</p>
          </div>
          <button aria-label="Nächste Woche" onClick={() => loadWeek(addDays(week.weekStart, 7))} className="rounded-lg border border-border p-2 text-muted hover:bg-surface-raised hover:text-foreground"><ChevronRight size={18} /></button>
          {loading && <LoaderCircle size={18} className="animate-spin text-accent" />}
        </div>
        <div className="flex flex-wrap gap-2 text-sm sm:gap-3">
          <div className="rounded-xl border border-border/80 bg-background/35 px-4 py-2.5"><span className="text-muted">Geplant</span><strong className="ml-2 text-lg">{plannedCount}</strong></div>
          <div className="rounded-xl border border-border/80 bg-background/35 px-4 py-2.5"><span className="text-muted">Erledigt</span><strong className="ml-2 text-lg text-positive">{completedCount}</strong></div>
          <div className="rounded-xl border border-border/80 bg-background/35 px-4 py-2.5"><span className="text-muted">Umfang</span><strong className="ml-2 text-lg">{planningMinutesLabel(week.plannedDurationMin)}</strong></div>
          <button onClick={duplicateWeek} disabled={duplicating || plannedCount === 0} className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 font-semibold text-muted hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40">{duplicating ? <LoaderCircle size={17} className="animate-spin" /> : <Copy size={17} />} Woche kopieren</button>
          <button onClick={() => setRegattaModal(emptyRegattaDraft(week.weekStart))} title={`${competitions.length} geplante Regatta${competitions.length === 1 ? "" : "en"}`} className="flex items-center gap-2 rounded-xl border border-fuchsia-400/40 px-4 py-2 font-semibold text-fuchsia-300 hover:bg-fuchsia-400/10"><Trophy size={17} /> Regatta planen</button>
          <button onClick={() => planSession()} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 font-semibold text-black hover:opacity-90"><Plus size={17} /> Einheit planen</button>
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
            return <div key={day.day} className="flex h-full min-w-0 flex-col items-center justify-end gap-1" title={day.sessions ? `${day.sessions} Einheit${day.sessions === 1 ? "" : "en"}` : "Erholungstag"}><div className={clsx("w-full max-w-12 rounded-t-lg transition-all", day.score === 0 ? "bg-border" : intensity?.color ?? "bg-muted")} style={{ height }} /><p className="text-[10px] font-semibold uppercase text-muted">{planningDateLabel(day.day, { weekday: "narrow" })}</p></div>;
          })}
        </div>
      </section>

      <WeekSchedule
        days={days}
        sessions={week.sessions}
        matches={matches}
        onPlan={planSession}
        onOpen={(session) => setDetailSessionId(session.id)}
        onEdit={editSession}
        onDuplicate={duplicateSession}
        onToggleStatus={(session) => updateStatus(session, session.status === "cancelled" ? "planned" : "cancelled")}
        onRemove={removeSession}
      />

      {regattaModal && (
        <RegattaDialog draft={regattaModal} saving={regattaSaving} onChange={setRegattaModal} onClose={() => setRegattaModal(null)} onSubmit={saveRegatta} />
      )}

      {detailSession && (
        <SessionDetailDrawer session={detailSession} matches={detailMatches} weekSessions={week.sessions} onClose={() => setDetailSessionId(null)} onEdit={editSession} onDuplicate={duplicateSession} onDecideMatch={decideMatch} onOpenReflection={openReflection} onRemoveMatch={removeMatch} onReviewAdaptation={reviewAdaptation} />
      )}

      {modal && (
        <SessionEditorDialog
          draft={modal}
          saving={modalSaving}
          onChange={setModal}
          onClose={() => setModal(null)}
          onSubmit={saveSession}
        />
      )}

      {reflectionModal && (
        <ReflectionDialog
          draft={reflectionModal}
          reviewLog={reviewLog}
          imported={reviewImported}
          loadingLog={reviewLogLoading}
          saving={reflectionSaving}
          newPainBodyPart={newPainBodyPart}
          onDraftChange={setReflectionModal}
          onReviewLogChange={setReviewLog}
          onNewPainBodyPartChange={setNewPainBodyPart}
          onAddPain={addReviewPain}
          onClose={() => setReflectionModal(null)}
          onSubmit={saveReflection}
        />
      )}
    </div>
  );
}
