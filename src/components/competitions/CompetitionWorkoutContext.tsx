import { Watch } from "lucide-react";
import { formatDistance, formatDuration } from "@/lib/competitionsPresentation";

export type WorkoutContext = {
  plannedSessionId: string;
  title: string;
  startedAt: string;
  durationSeconds: number | null;
  distanceMeters: number | null;
  avgHeartRate: number | null;
  source: string;
};

/**
 * Zeigt die einer Regatta zugeordnete Uhr-Aktivität als reinen
 * Trainingskontext – ausdrücklich nicht als offizielle Rennzeit oder
 * Bestleistung. Aus CompetitionsSection ausgelagert.
 */
export function CompetitionWorkoutContext({ context }: { context: WorkoutContext | undefined }) {
  if (!context) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-raised/40 p-4">
        <div className="flex items-start gap-3">
          <Watch size={18} className="mt-0.5 text-muted" />
          <div>
            <p className="text-sm font-medium">Noch keine Uhr-Aktivität zugeordnet</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">Ordne die Aktivität im Trainingsplan der Regatta zu. Das ist der Belastungsnachweis – nicht automatisch deine Rennzeit.</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-accent/25 bg-accent/5 p-4">
      <div className="flex items-start gap-3">
        <Watch size={18} className="mt-0.5 text-accent" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="text-xs font-semibold uppercase tracking-wider text-accent">Zugeordnete Uhr-Aktivität</p><p className="mt-1 text-sm font-semibold">{context.title}</p></div>
            <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted">Trainingskontext</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div><span className="block text-xs text-muted">Gesamtdauer</span>{formatDuration(context.durationSeconds)}</div>
            <div><span className="block text-xs text-muted">Gesamtdistanz</span>{formatDistance(context.distanceMeters)}</div>
            <div><span className="block text-xs text-muted">Ø Herzfrequenz</span>{context.avgHeartRate ? `${context.avgHeartRate} bpm` : "–"}</div>
            <div><span className="block text-xs text-muted">Quelle</span>{context.source === "garmin" ? "Garmin" : context.source}</div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">Die Aktivität kann Ablegen, Einrudern und Anlegen enthalten. Sie wird deshalb nicht als offizielle Rennzeit oder Bestleistung gewertet.</p>
        </div>
      </div>
    </div>
  );
}
