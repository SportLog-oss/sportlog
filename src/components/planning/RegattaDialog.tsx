"use client";

import type { FormEvent } from "react";
import { LoaderCircle, Trophy, X } from "lucide-react";

export type RegattaDraft = {
  name: string;
  date: string;
  location: string;
  distanceMeters: string;
  boatClass: string;
  crew: string;
  goal: string;
};

export function emptyRegattaDraft(date: string): RegattaDraft {
  return { name: "", date, location: "", distanceMeters: "2000", boatClass: "", crew: "", goal: "" };
}

type Props = {
  draft: RegattaDraft;
  saving: boolean;
  onChange: (draft: RegattaDraft) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
};

export function RegattaDialog({ draft, saving, onChange, onClose, onSubmit }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form onSubmit={onSubmit} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-fuchsia-400/30 bg-surface p-5 shadow-2xl sm:p-7">
        <div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-fuchsia-300">Wettkampf planen</p><h2 className="mt-2 text-2xl font-semibold">Neue Regatta</h2><p className="mt-1 text-sm text-muted">Die Regatta wird automatisch als Wettkampf-Einheit mit deiner Trainingswoche verbunden.</p></div><button type="button" aria-label="Schließen" onClick={onClose} className="rounded-full border border-border p-2 text-muted hover:text-foreground"><X size={18} /></button></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2"><span className="mb-1.5 block text-muted">Name der Regatta</span><input required autoFocus value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} placeholder="z. B. Münchner Regatta" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-fuchsia-400" /></label>
          <label className="text-sm"><span className="mb-1.5 block text-muted">Datum</span><input required type="date" value={draft.date} onChange={(event) => onChange({ ...draft, date: event.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-fuchsia-400" /></label>
          <label className="text-sm"><span className="mb-1.5 block text-muted">Ort</span><input value={draft.location} onChange={(event) => onChange({ ...draft, location: event.target.value })} placeholder="Ort oder Gewässer" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-fuchsia-400" /></label>
          <label className="text-sm"><span className="mb-1.5 block text-muted">Strecke</span><div className="relative"><input type="number" min="100" value={draft.distanceMeters} onChange={(event) => onChange({ ...draft, distanceMeters: event.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pr-10 outline-none focus:border-fuchsia-400" /><span className="absolute right-3 top-2.5 text-sm text-muted">m</span></div></label>
          <label className="text-sm"><span className="mb-1.5 block text-muted">Bootsklasse</span><input value={draft.boatClass} onChange={(event) => onChange({ ...draft, boatClass: event.target.value })} placeholder="z. B. 1x, 2x, 4-" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-fuchsia-400" /></label>
          <label className="text-sm sm:col-span-2"><span className="mb-1.5 block text-muted">Mannschaft</span><input value={draft.crew} onChange={(event) => onChange({ ...draft, crew: event.target.value })} placeholder="Optional" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-fuchsia-400" /></label>
          <label className="text-sm sm:col-span-2"><span className="mb-1.5 block text-muted">Ziel für die Regatta</span><textarea rows={3} value={draft.goal} onChange={(event) => onChange({ ...draft, goal: event.target.value })} placeholder="Was möchtest du bei dieser Regatta erreichen?" className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-fuchsia-400" /></label>
        </div>
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm text-muted hover:text-foreground">Abbrechen</button><button disabled={saving} className="flex items-center gap-2 rounded-xl bg-fuchsia-400 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Trophy size={16} />} Regatta einplanen</button></div>
      </form>
    </div>
  );
}
