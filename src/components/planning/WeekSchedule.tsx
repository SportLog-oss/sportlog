"use client";

import { CalendarDays, CheckCircle2, ChevronRight, CircleOff, ClipboardList, Copy, Pencil, Plus, RotateCcw, Trash2, Trophy } from "lucide-react";
import clsx from "clsx";
import type { PlannedSession, PlanningWorkoutMatch } from "@/lib/planning";
import { INTENSITIES, planningDateLabel } from "@/lib/planningPresentation";

type WeekScheduleProps = {
  days: string[];
  sessions: PlannedSession[];
  matches: PlanningWorkoutMatch[];
  onPlan: (day: string) => void;
  onOpen: (session: PlannedSession) => void;
  onEdit: (session: PlannedSession) => void;
  onDuplicate: (session: PlannedSession) => void;
  onToggleStatus: (session: PlannedSession) => void;
  onRemove: (session: PlannedSession) => void;
};

export function WeekSchedule({ days, sessions, matches, onPlan, onOpen, onEdit, onDuplicate, onToggleStatus, onRemove }: WeekScheduleProps) {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
      {days.map((day) => {
        const daySessions = sessions.filter((session) => session.scheduledDate === day);
        const isToday = day === today;

        return (
          <article key={day} className={clsx("group/day min-h-52 rounded-2xl border p-3 transition-colors", isToday ? "border-accent/60 bg-gradient-to-b from-accent-soft to-surface shadow-[0_0_28px_rgba(37,216,207,0.06)]" : "border-border bg-surface hover:border-border/80")}>
            <div className="mb-3 flex items-start justify-between border-b border-border pb-3">
              <div><p className={clsx("text-xs font-semibold uppercase tracking-wide", isToday ? "text-accent" : "text-muted")}>{planningDateLabel(day, { weekday: "long" })}</p><p className="mt-0.5 font-semibold">{planningDateLabel(day, { day: "2-digit", month: "2-digit" })}{isToday ? " · Heute" : ""}</p></div>
              <button aria-label={`Einheit am ${day} planen`} onClick={() => onPlan(day)} className="rounded-lg p-1.5 text-muted hover:bg-accent-soft hover:text-accent"><Plus size={16} /></button>
            </div>
            <div className="space-y-2">
              {daySessions.map((session) => {
                const intensity = INTENSITIES.find((item) => item.value === session.plannedIntensity);
                const sessionMatches = matches.filter((match) => match.plannedSessionId === session.id);
                const hasConfirmedMatch = sessionMatches.some((match) => match.status === "confirmed");

                return (
                  <div key={session.id} className={clsx("group rounded-xl border border-border bg-surface-raised p-3", session.status === "cancelled" && "opacity-55")}>
                    <button type="button" onClick={() => onOpen(session)} className="flex w-full items-start gap-2 text-left">{session.raceId ? <Trophy size={15} className="mt-0.5 shrink-0 text-fuchsia-300" /> : <span className={clsx("mt-1.5 h-2 w-2 shrink-0 rounded-full", intensity?.color ?? "bg-muted")} />}<div className="min-w-0 flex-1"><p className={clsx("text-sm font-semibold leading-snug", session.status === "cancelled" && "line-through")}>{session.title}</p><p className={clsx("mt-1 text-xs", session.raceId ? "font-semibold text-fuchsia-300" : "text-muted")}>{session.raceId ? "Regatta" : session.sportType}{session.plannedDurationMin ? ` · ${session.plannedDurationMin} min` : ""}</p>{session.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{session.description}</p>}</div><ChevronRight size={15} className="mt-0.5 shrink-0 text-muted" /></button>
                    <div className="mt-3 flex items-center gap-1 border-t border-border pt-2 opacity-100 transition-opacity xl:opacity-0 xl:group-hover:opacity-100 xl:group-focus-within:opacity-100">
                      <button aria-label="Bearbeiten" onClick={() => onEdit(session)} className="rounded p-1 text-muted hover:text-accent"><Pencil size={14} /></button>
                      <button aria-label="Einheit duplizieren" onClick={() => onDuplicate(session)} className="rounded p-1 text-muted hover:text-accent"><Copy size={14} /></button>
                      <button aria-label={session.status === "cancelled" ? "Wieder einplanen" : "Als ausgefallen markieren"} onClick={() => onToggleStatus(session)} className="rounded p-1 text-muted hover:text-warning">{session.status === "cancelled" ? <RotateCcw size={14} /> : <CircleOff size={14} />}</button>
                      <button aria-label="Löschen" onClick={() => onRemove(session)} className="ml-auto rounded p-1 text-muted hover:text-negative"><Trash2 size={14} /></button>
                    </div>
                    <button onClick={() => onOpen(session)} className={clsx("mt-3 flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-semibold", hasConfirmedMatch ? "border-positive/30 bg-positive/10 text-positive" : "border-border bg-background/30 text-muted hover:border-accent/30 hover:text-accent")}>
                      {hasConfirmedMatch ? <CheckCircle2 size={14} /> : <ClipboardList size={14} />}
                      <span className="min-w-0 flex-1 truncate">{hasConfirmedMatch ? "Plan und Ergebnis ansehen" : sessionMatches.length ? "Plan und Zuordnung prüfen" : "Trainingsinhalt ansehen"}</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                );
              })}
              {daySessions.length === 0 && <button onClick={() => onPlan(day)} className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border py-6 text-xs text-muted hover:border-accent/40 hover:text-accent"><CalendarDays size={18} /> Noch frei</button>}
            </div>
          </article>
        );
      })}
    </section>
  );
}
