"use client";

import clsx from "clsx";
import { CalendarDays, CheckCircle2, ClipboardList, Copy, ExternalLink, Lightbulb, MessageSquareText, Pencil, Sparkles, X } from "lucide-react";
import type { PlannedSession, PlanningWorkoutMatch } from "@/lib/planning";
import { adaptationFor, type AdaptationSuggestion } from "@/lib/trainingAdaptation";
import { INTENSITIES, planningDateLabel } from "@/lib/planningPresentation";

type Props = {
  session: PlannedSession;
  matches: PlanningWorkoutMatch[];
  weekSessions: PlannedSession[];
  onClose: () => void;
  onEdit: (session: PlannedSession) => void;
  onDuplicate: (session: PlannedSession) => void | Promise<void>;
  onDecideMatch: (match: PlanningWorkoutMatch, status: "confirmed" | "rejected") => void | Promise<void>;
  onOpenReflection: (match: PlanningWorkoutMatch) => void | Promise<void>;
  onRemoveMatch: (match: PlanningWorkoutMatch) => void | Promise<void>;
  onReviewAdaptation: (session: PlannedSession, adaptation: AdaptationSuggestion) => void;
};

export function SessionDetailDrawer({ session, matches, weekSessions, onClose, onEdit, onDuplicate, onDecideMatch, onOpenReflection, onRemoveMatch, onReviewAdaptation }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="h-full w-full overflow-y-auto border-l border-border bg-surface p-5 shadow-2xl sm:max-w-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Einheit im Detail</p><h2 className="mt-2 text-2xl font-semibold">{session.title}</h2><p className="mt-1 text-sm text-muted">{planningDateLabel(session.scheduledDate, { weekday: "long", day: "numeric", month: "long" })} · {session.sportType}{session.plannedDurationMin ? ` · ${session.plannedDurationMin} Minuten` : ""}</p></div>
          <button aria-label="Schließen" onClick={onClose} className="rounded-full border border-border p-2 text-muted hover:text-foreground"><X size={19} /></button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => { onEdit(session); onClose(); }} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted hover:text-accent"><Pencil size={15} /> Plan bearbeiten</button><button onClick={() => onDuplicate(session)} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted hover:text-accent"><Copy size={15} /> Duplizieren</button></div>
        <section className="mt-6 rounded-2xl border border-accent/25 bg-accent-soft p-4 sm:p-5">
          <div className="flex items-start gap-3"><ClipboardList size={20} className="mt-0.5 shrink-0 text-accent" /><div><p className="text-xs font-semibold uppercase tracking-wide text-accent">Geplanter Trainingsreiz</p><p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{session.description || "Noch kein genauer Trainingsinhalt hinterlegt."}</p><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-border bg-background/40 px-2.5 py-1">{session.plannedDurationMin ? `${session.plannedDurationMin} Minuten` : "Dauer offen"}</span><span className="rounded-full border border-border bg-background/40 px-2.5 py-1">{INTENSITIES.find((item) => item.value === session.plannedIntensity)?.label ?? "Belastung offen"}</span></div></div></div>
        </section>
        <div className="mt-7 space-y-4">
          {matches.length === 0 && <div className="rounded-2xl border border-dashed border-border p-6 text-center"><CalendarDays size={24} className="mx-auto text-muted" /><p className="mt-3 font-semibold">Noch keine Garmin-Aktivität zugeordnet</p><p className="mt-1 text-sm text-muted">Sobald SportLog eine passende Aktivität findet, kannst du sie hier bestätigen.</p></div>}
          {matches.map((match) => {
            const actualMinutes = match.workout.durationSeconds ? Math.round(match.workout.durationSeconds / 60) : null;
            const deviationMinutes = session.plannedDurationMin !== null && actualMinutes !== null ? actualMinutes - session.plannedDurationMin : null;
            const savedReflection = match.reflection;
            const adaptation = match.status === "confirmed" ? adaptationFor(match) : null;
            const nextSession = adaptation ? weekSessions.filter((candidate) => candidate.status !== "cancelled" && candidate.scheduledDate > session.scheduledDate).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0] : null;
            return <section key={match.workoutId} className={clsx("rounded-2xl border p-4 sm:p-5", match.status === "confirmed" ? "border-positive/30 bg-positive/5" : "border-accent/30 bg-accent-soft")}>
              <div className="flex items-start gap-3">{match.status === "confirmed" ? <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-positive" /> : <Sparkles size={20} className="mt-0.5 shrink-0 text-accent" />}<div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-muted">{match.status === "confirmed" ? "Garmin zugeordnet" : `${Math.round(match.score * 100)} % Übereinstimmung`}</p><h3 className="mt-1 text-lg font-semibold">{match.workout.title}</h3><p className="mt-1 text-sm text-muted">{new Date(match.workout.startedAt).toLocaleDateString("de-DE")}{actualMinutes ? ` · ${actualMinutes} Minuten` : ""}</p></div></div>
              {match.status === "confirmed" && deviationMinutes !== null && <div className="mt-5 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-background/45 p-3 text-center"><div><p className="text-[10px] uppercase tracking-wide text-muted">Geplant</p><p className="mt-1 font-semibold">{session.plannedDurationMin} min</p></div><div><p className="text-[10px] uppercase tracking-wide text-muted">Tatsächlich</p><p className="mt-1 font-semibold text-accent">{actualMinutes} min</p></div><div><p className="text-[10px] uppercase tracking-wide text-muted">Abweichung</p><p className={clsx("mt-1 font-semibold", deviationMinutes === 0 ? "text-positive" : "text-warning")}>{deviationMinutes > 0 ? "+" : ""}{deviationMinutes} min</p></div></div>}
              <div className="mt-4 flex flex-wrap gap-2">{match.status === "suggested" ? <><button onClick={() => onDecideMatch(match, "confirmed")} className="rounded-xl bg-positive/15 px-3 py-2 text-sm font-semibold text-positive">Zuordnung bestätigen</button><button onClick={() => onDecideMatch(match, "rejected")} className="rounded-xl px-3 py-2 text-sm text-muted hover:text-foreground">Nicht passend</button></> : <><button onClick={() => onOpenReflection(match)} className="flex items-center gap-2 rounded-xl bg-accent/10 px-3 py-2 text-sm font-semibold text-accent"><MessageSquareText size={15} />{savedReflection ? "Reflexion bearbeiten" : "Training reflektieren"}</button>{match.workout.externalId && <a href={`/training/${match.workout.externalId}`} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted hover:border-accent/40 hover:text-accent"><ExternalLink size={15} /> Aktivitätsdetails öffnen</a>}<button onClick={() => onRemoveMatch(match)} className="rounded-xl px-3 py-2 text-sm text-muted hover:text-negative">Zuordnung lösen</button></>}</div>
              {savedReflection && <p className="mt-4 text-sm text-positive">Reflexion gespeichert{savedReflection.perceivedExertion ? ` · RPE ${savedReflection.perceivedExertion}/10` : ""}</p>}
              {adaptation && <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-4"><div className="flex gap-3"><Lightbulb size={18} className="mt-0.5 shrink-0 text-warning" /><div><p className="font-semibold text-warning">{adaptation.title}</p><p className="mt-1 text-sm text-muted">{adaptation.reason} SportLog ändert nichts automatisch.</p></div></div>{nextSession ? <button onClick={() => onReviewAdaptation(nextSession, adaptation)} className="mt-3 rounded-lg bg-warning/15 px-3 py-2 text-sm font-semibold text-warning">Vorschlag für {nextSession.title} prüfen</button> : <p className="mt-3 text-sm text-muted">Keine spätere Einheit in dieser Woche geplant.</p>}</div>}
            </section>;
          })}
        </div>
      </aside>
    </div>
  );
}
