"use client";

import type { FormEventHandler } from "react";
import { Clock3, LoaderCircle, X } from "lucide-react";
import type { PlanningIntensity } from "@/lib/planning";
import {
  INTENSITIES,
  SPORT_OPTIONS,
  type SessionDraft,
} from "@/lib/planningPresentation";

type SessionEditorDialogProps = {
  draft: SessionDraft;
  saving: boolean;
  onChange: (draft: SessionDraft) => void;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function SessionEditorDialog({
  draft,
  saving,
  onChange,
  onClose,
  onSubmit,
}: SessionEditorDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form
        onSubmit={onSubmit}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              {draft.id ? "Einheit bearbeiten" : "Neue Einheit"}
            </p>
            <h2 className="mt-1 text-xl font-semibold">Training planen</h2>
          </div>
          <button type="button" aria-label="Schließen" onClick={onClose} className="text-muted hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="mb-1.5 block text-muted">Titel</span>
            <input required autoFocus value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} placeholder="z. B. Grundlagenausdauer" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent" />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-muted">Datum</span>
            <input required type="date" value={draft.scheduledDate} onChange={(event) => onChange({ ...draft, scheduledDate: event.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent" />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-muted">Sportart</span>
            <select value={draft.sportType} onChange={(event) => onChange({ ...draft, sportType: event.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent">
              {SPORT_OPTIONS.map((sport) => <option key={sport}>{sport}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-muted">Dauer in Minuten</span>
            <input type="number" min="1" max="1440" value={draft.plannedDurationMin} onChange={(event) => onChange({ ...draft, plannedDurationMin: event.target.value })} placeholder="60" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent" />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-muted">Intensität</span>
            <select value={draft.plannedIntensity} onChange={(event) => onChange({ ...draft, plannedIntensity: event.target.value as PlanningIntensity })} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent">
              <option value="">Nicht festgelegt</option>
              {INTENSITIES.map((intensity) => <option key={intensity.value} value={intensity.value}>{intensity.label}</option>)}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1.5 block text-muted">Tageszeit</span>
            <select value={draft.timeOfDay} onChange={(event) => onChange({ ...draft, timeOfDay: event.target.value as SessionDraft["timeOfDay"] })} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent">
              <option value="morning">Morgens</option>
              <option value="midday">Mittags</option>
              <option value="afternoon">Nachmittags</option>
              <option value="evening">Abends</option>
              <option value="custom">Flexibel</option>
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1.5 block text-muted">Trainingsinhalt und Belastungsserie</span>
            <textarea rows={5} value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} placeholder={'z. B. 3 × (5 × 30 s hart / 1 min locker)\n5 min Serienpause\nFokus: explosiver Antritt, technisch sauber bleiben'} className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-accent" />
            <span className="mt-1.5 block text-xs leading-relaxed text-muted">Hier gehört der genaue Reiz hinein – Serien, Wiederholungen, Belastungsdauer, Pause und technischer Fokus.</span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm text-muted hover:text-foreground">Abbrechen</button>
          <button disabled={saving} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50">
            {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Clock3 size={16} />}
            {draft.id ? "Änderungen speichern" : "Einheit einplanen"}
          </button>
        </div>
      </form>
    </div>
  );
}
