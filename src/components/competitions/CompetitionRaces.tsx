import { Plus, Trash2 } from "lucide-react";
import type { CompetitionRace, CompetitionResult } from "@/lib/types";
import { formatOfficialTime } from "@/lib/competitionsPresentation";

export const raceTypeLabels: Record<CompetitionRace["raceType"], string> = {
  time_trial: "Zeitfahren",
  heat: "Vorlauf",
  repechage: "Hoffnungslauf",
  quarterfinal: "Viertelfinale",
  semifinal: "Halbfinale",
  final: "Finale",
  other: "Sonstiges Rennen",
};

export const raceStatusLabels: Record<CompetitionRace["status"], string> = {
  planned: "Geplant",
  completed: "Offiziell",
  dns: "Nicht gestartet",
  dnf: "Nicht beendet",
  dsq: "Disqualifiziert",
  cancelled: "Abgesagt",
};

export type RaceFormValues = {
  raceType: string;
  label: string;
  scheduledAt: string;
  distanceMeters: string;
  boatClass: string;
  crew: string;
  status: string;
  officialTime: string;
  placement: string;
  fieldSize: string;
  resultSource: string;
  resultSourceUrl: string;
  weather: string;
  wind: string;
  notes: string;
};

export const emptyRaceForm: RaceFormValues = {
  raceType: "heat",
  label: "",
  scheduledAt: "",
  distanceMeters: "2000",
  boatClass: "",
  crew: "",
  status: "planned",
  officialTime: "",
  placement: "",
  fieldSize: "",
  resultSource: "",
  resultSourceUrl: "",
  weather: "",
  wind: "",
  notes: "",
};

type Props = {
  competition: CompetitionResult;
  editorOpen: boolean;
  raceForm: RaceFormValues;
  raceError: string;
  savingRace: boolean;
  onOpenEditor: () => void;
  onFormChange: (form: RaceFormValues) => void;
  onSave: () => void;
  onCancelEditor: () => void;
  onDeleteRace: (raceId: string) => void;
};

/**
 * Rennliste und Renneditor für eine einzelne Regatta: jeder Lauf
 * (Vorlauf, Hoffnungslauf, Finale, …) bekommt sein eigenes offizielles
 * Ergebnis. Aus CompetitionsSection ausgelagert.
 */
export function CompetitionRaces({ competition, editorOpen, raceForm, raceError, savingRace, onOpenEditor, onFormChange, onSave, onCancelEditor, onDeleteRace }: Props) {
  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-sm font-semibold">Rennen dieser Regatta</p><p className="text-xs text-muted">Jeder Lauf bekommt sein eigenes offizielles Ergebnis.</p></div>
        <button onClick={onOpenEditor} className="flex items-center gap-1.5 rounded-lg border border-accent/40 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/10"><Plus size={15} /> Rennen hinzufügen</button>
      </div>

      {competition.races.length === 0 && <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">Noch kein einzelnes Rennen angelegt.</div>}
      {competition.races.map((race) => (
        <div key={race.id} className="rounded-xl border border-border bg-surface-raised/45 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{race.label || raceTypeLabels[race.raceType]}</span><span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">{raceStatusLabels[race.status]}</span></div>
              <p className="mt-1 text-xs text-muted">{race.distanceMeters} m · {race.boatClass || "Bootsklasse offen"}{race.scheduledAt ? ` · ${new Date(race.scheduledAt).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}` : ""}</p>
            </div>
            <button onClick={() => onDeleteRace(race.id)} className="text-muted hover:text-negative" aria-label="Rennen löschen"><Trash2 size={15} /></button>
          </div>
          {race.status !== "planned" && <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm sm:grid-cols-4"><div><span className="block text-xs text-muted">Offizielle Zeit</span>{formatOfficialTime(race.officialTimeSeconds)}</div><div><span className="block text-xs text-muted">Platz</span>{race.placement ?? "–"}{race.fieldSize ? ` / ${race.fieldSize}` : ""}</div><div><span className="block text-xs text-muted">Quelle</span>{race.resultSource || "–"}</div><div><span className="block text-xs text-muted">Bedingungen</span>{[race.weather, race.wind].filter(Boolean).join(" · ") || "–"}</div></div>}
        </div>
      ))}

      {editorOpen && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-muted">Rennphase<select className="mt-1 block w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground" value={raceForm.raceType} onChange={(e) => onFormChange({ ...raceForm, raceType: e.target.value })}>{Object.entries(raceTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-xs text-muted">Bezeichnung<input placeholder="z. B. A-Finale" className="mt-1 block w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground" value={raceForm.label} onChange={(e) => onFormChange({ ...raceForm, label: e.target.value })} /></label>
            <label className="text-xs text-muted">Startzeit<input type="datetime-local" className="mt-1 block w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground" value={raceForm.scheduledAt} onChange={(e) => onFormChange({ ...raceForm, scheduledAt: e.target.value })} /></label>
            <label className="text-xs text-muted">Status<select className="mt-1 block w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground" value={raceForm.status} onChange={(e) => onFormChange({ ...raceForm, status: e.target.value })}>{Object.entries(raceStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-xs text-muted">Strecke<input type="number" min="1" className="mt-1 block w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground" value={raceForm.distanceMeters} onChange={(e) => onFormChange({ ...raceForm, distanceMeters: e.target.value })} /></label>
            <label className="text-xs text-muted">Bootsklasse<input className="mt-1 block w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground" value={raceForm.boatClass} onChange={(e) => onFormChange({ ...raceForm, boatClass: e.target.value })} /></label>
            <label className="text-xs text-muted">Offizielle Zeit<input placeholder="z. B. 6:42,18" className="mt-1 block w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground" value={raceForm.officialTime} onChange={(e) => onFormChange({ ...raceForm, officialTime: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3"><label className="text-xs text-muted">Platz<input type="number" min="1" className="mt-1 block w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground" value={raceForm.placement} onChange={(e) => onFormChange({ ...raceForm, placement: e.target.value })} /></label><label className="text-xs text-muted">von<input type="number" min="1" className="mt-1 block w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground" value={raceForm.fieldSize} onChange={(e) => onFormChange({ ...raceForm, fieldSize: e.target.value })} /></label></div>
            <label className="text-xs text-muted">Ergebnisquelle<input placeholder="z. B. Regattabüro" className="mt-1 block w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground" value={raceForm.resultSource} onChange={(e) => onFormChange({ ...raceForm, resultSource: e.target.value })} /></label>
            <label className="text-xs text-muted">Link zur Ergebnisliste<input type="url" placeholder="https://…" className="mt-1 block w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground" value={raceForm.resultSourceUrl} onChange={(e) => onFormChange({ ...raceForm, resultSourceUrl: e.target.value })} /></label>
          </div>
          {raceError && <p className="mt-3 text-sm text-negative">{raceError}</p>}
          <div className="mt-4 flex gap-2"><button disabled={savingRace} onClick={onSave} className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-black disabled:opacity-50">{savingRace ? "Wird gespeichert …" : "Rennen speichern"}</button><button onClick={onCancelEditor} className="px-3 py-2 text-sm text-muted">Abbrechen</button></div>
        </div>
      )}
    </div>
  );
}
