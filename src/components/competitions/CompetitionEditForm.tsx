import { X } from "lucide-react";

export type CompetitionEditFormValues = {
  name: string;
  date: string;
  location: string;
  boatClass: string;
  crew: string;
  goal: string;
  distanceMeters: string;
  result: string;
  placement: string;
  avgHeartRate: string;
  weather: string;
  wind: string;
  notes: string;
  splitsRaw: string;
};

type Props = {
  value: CompetitionEditFormValues;
  onChange: (value: CompetitionEditFormValues) => void;
  onSave: () => void;
  onCancel: () => void;
};

/**
 * Bearbeitungsformular für Stammdaten und offizielles Ergebnis einer
 * Regatta (Zeit, Platzierung, Bedingungen, Zwischenzeiten, Notizen).
 * Aus CompetitionsSection ausgelagert.
 */
export function CompetitionEditForm({ value, onChange, onSave, onCancel }: Props) {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <input placeholder="Name" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
        value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      <input type="date" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
        value={value.date} onChange={(e) => onChange({ ...value, date: e.target.value })} />
      <input placeholder="Ort" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
        value={value.location} onChange={(e) => onChange({ ...value, location: e.target.value })} />
      <input placeholder="Strecke (m)" type="number" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
        value={value.distanceMeters} onChange={(e) => onChange({ ...value, distanceMeters: e.target.value })} />
      <input placeholder="Bootsklasse" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
        value={value.boatClass} onChange={(e) => onChange({ ...value, boatClass: e.target.value })} />
      <input placeholder="Mannschaft" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
        value={value.crew} onChange={(e) => onChange({ ...value, crew: e.target.value })} />
      <input placeholder="Ziel" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm md:col-span-2"
        value={value.goal} onChange={(e) => onChange({ ...value, goal: e.target.value })} />

      <div className="md:col-span-2 border-t border-border pt-3 mt-1 text-xs text-muted uppercase tracking-wide">Ergebnis</div>
      <input placeholder="Ergebnis (Zeit)" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
        value={value.result} onChange={(e) => onChange({ ...value, result: e.target.value })} />
      <input placeholder="Platzierung" type="number" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
        value={value.placement} onChange={(e) => onChange({ ...value, placement: e.target.value })} />
      <input placeholder="Ø Herzfrequenz" type="number" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
        value={value.avgHeartRate} onChange={(e) => onChange({ ...value, avgHeartRate: e.target.value })} />
      <input placeholder="Wetter" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
        value={value.weather} onChange={(e) => onChange({ ...value, weather: e.target.value })} />
      <input placeholder="Wind" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm"
        value={value.wind} onChange={(e) => onChange({ ...value, wind: e.target.value })} />
      <textarea placeholder={"Splitzeiten, eine pro Zeile: 500m: 1:45.2"} className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm md:col-span-2"
        value={value.splitsRaw} onChange={(e) => onChange({ ...value, splitsRaw: e.target.value })} />
      <textarea placeholder="Notizen" className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm md:col-span-2"
        value={value.notes} onChange={(e) => onChange({ ...value, notes: e.target.value })} />
      <div className="md:col-span-2 flex items-center gap-2">
        <button onClick={onSave} className="bg-accent text-black rounded-lg px-3 py-2 text-sm font-medium">
          Speichern
        </button>
        <button onClick={onCancel} className="flex items-center gap-1 text-sm text-muted px-3 py-2">
          <X size={14} /> Abbrechen
        </button>
      </div>
    </div>
  );
}
