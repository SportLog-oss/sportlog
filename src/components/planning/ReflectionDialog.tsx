"use client";

import type { FormEvent } from "react";
import clsx from "clsx";
import { LoaderCircle, Plus, X } from "lucide-react";
import type { TrainingDeviationReason, TrainingFeeling } from "@/lib/planning";
import type { TrainingLogEntry } from "@/lib/types";

export type ReflectionDraft = {
  plannedSessionId: string;
  workoutId: string;
  feeling: TrainingFeeling | "";
  perceivedExertion: string;
  deviationReason: TrainingDeviationReason | "";
  note: string;
};

export type ReflectionReviewLog = Pick<TrainingLogEntry, "pain" | "injury" | "soreness" | "rpe" | "notes">;
export type ImportedReflection = { rpe: number | null; feel: number | null };

type ReflectionDialogProps = {
  draft: ReflectionDraft;
  reviewLog: ReflectionReviewLog;
  imported: ImportedReflection;
  loadingLog: boolean;
  saving: boolean;
  newPainBodyPart: string;
  onDraftChange: (draft: ReflectionDraft) => void;
  onReviewLogChange: (log: ReflectionReviewLog) => void;
  onNewPainBodyPartChange: (value: string) => void;
  onAddPain: () => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
};

const FEELINGS: { value: TrainingFeeling; label: string }[] = [
  { value: "great", label: "Sehr gut" },
  { value: "good", label: "Gut" },
  { value: "okay", label: "Okay" },
  { value: "hard", label: "Schwer" },
  { value: "bad", label: "Schlecht" },
];

export function ReflectionDialog({ draft, reviewLog, imported, loadingLog, saving, newPainBodyPart, onDraftChange, onReviewLogChange, onNewPainBodyPartChange, onAddPain, onClose, onSubmit }: ReflectionDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form onSubmit={onSubmit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-accent">Nach dem Training</p><h2 className="mt-1 text-xl font-semibold">Wie lief deine Einheit?</h2><p className="mt-1 text-sm text-muted">Kurz festhalten, was Zahlen allein nicht erklären.</p></div>
          <button type="button" aria-label="Schließen" onClick={onClose} className="text-muted hover:text-foreground"><X size={20} /></button>
        </div>
        <div className="space-y-5">
          {(imported.rpe !== null || imported.feel !== null) && <div className="rounded-xl border border-accent/30 bg-accent-soft p-3"><div className="flex items-center justify-between"><p className="text-xs font-semibold">Von deiner Uhr übernommen</p><span className="text-[11px] text-accent">Garmin · schreibgeschützt</span></div><div className="mt-2 grid grid-cols-2 gap-3 text-sm">{imported.rpe !== null && <div><p className="text-xs text-muted">Belastung</p><p className="font-semibold">RPE {imported.rpe}/10</p></div>}{imported.feel !== null && <div><p className="text-xs text-muted">Trainingsgefühl</p><p className="font-semibold">{imported.feel}/100</p></div>}</div></div>}
          {imported.feel == null && <fieldset><legend className="mb-2 text-sm text-muted">Wie hast du dich gefühlt?</legend><div className="grid grid-cols-5 gap-2">{FEELINGS.map(({ value, label }) => <button key={value} type="button" onClick={() => onDraftChange({ ...draft, feeling: value })} className={clsx("rounded-xl border px-2 py-2 text-xs", draft.feeling === value ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-foreground")}>{label}</button>)}</div></fieldset>}
          {imported.rpe == null && <label className="block text-sm"><span className="mb-1.5 block text-muted">Empfundene Belastung (RPE 1–10)</span><input type="number" min="1" max="10" value={draft.perceivedExertion} onChange={(event) => onDraftChange({ ...draft, perceivedExertion: event.target.value })} placeholder="z. B. 7" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent" /></label>}
          <div><div className="mb-2 flex items-center justify-between"><p className="text-sm text-muted">Schmerzen oder Beschwerden</p>{loadingLog && <LoaderCircle size={15} className="animate-spin text-accent" />}</div><div className="space-y-2">{reviewLog.pain.map((pain, index) => <div key={`${pain.bodyPart}-${index}`} className="grid grid-cols-[1fr_90px_auto] items-center gap-2"><span className="text-sm">{pain.bodyPart}</span><input aria-label={`Schmerzstärke ${pain.bodyPart}`} type="number" min="0" max="10" value={pain.intensity} onChange={(event) => onReviewLogChange({ ...reviewLog, pain: reviewLog.pain.map((item, itemIndex) => itemIndex === index ? { ...item, intensity: Number(event.target.value) } : item) })} className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-accent" /><button type="button" aria-label={`${pain.bodyPart} entfernen`} onClick={() => onReviewLogChange({ ...reviewLog, pain: reviewLog.pain.filter((_, itemIndex) => itemIndex !== index) })} className="text-muted hover:text-negative"><X size={15} /></button></div>)}</div><div className="mt-2 flex gap-2"><input value={newPainBodyPart} onChange={(event) => onNewPainBodyPartChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onAddPain(); } }} placeholder="z. B. Knie rechts" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent" /><button type="button" onClick={onAddPain} className="rounded-xl border border-accent/40 px-3 text-accent"><Plus size={16} /></button></div></div>
          <label className="flex items-center justify-between text-sm"><span className="text-muted">Verletzungsverdacht</span><input type="checkbox" checked={reviewLog.injury} onChange={(event) => onReviewLogChange({ ...reviewLog, injury: event.target.checked })} className="h-4 w-4 accent-accent" /></label>
          <label className="block text-sm"><span className="mb-1.5 block text-muted">Muskelkater (0–10)</span><input type="number" min="0" max="10" value={reviewLog.soreness ?? ""} onChange={(event) => onReviewLogChange({ ...reviewLog, soreness: event.target.value ? Number(event.target.value) : null })} placeholder="0" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent" /></label>
          <label className="block text-sm"><span className="mb-1.5 block text-muted">Warum wich das Training vom Plan ab?</span><select value={draft.deviationReason} onChange={(event) => onDraftChange({ ...draft, deviationReason: event.target.value as TrainingDeviationReason | "" })} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent"><option value="">Kein Grund ausgewählt</option><option value="felt-good">Ich fühlte mich stärker als erwartet</option><option value="felt-tired">Ich war müder als erwartet</option><option value="schedule">Zeit oder Alltag</option><option value="conditions">Bedingungen oder Material</option><option value="plan-adjustment">Plan bewusst angepasst</option><option value="other">Anderer Grund</option></select></label>
          <label className="block text-sm"><span className="mb-1.5 block text-muted">Kurze Notiz (optional)</span><textarea rows={3} maxLength={1000} value={draft.note} onChange={(event) => onDraftChange({ ...draft, note: event.target.value })} placeholder="Was möchtest du für die nächste Einheit festhalten?" className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent" /></label>
        </div>
        <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm text-muted hover:text-foreground">Abbrechen</button><button disabled={saving} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50">{saving && <LoaderCircle size={16} className="animate-spin" />}Reflexion speichern</button></div>
      </form>
    </div>
  );
}
