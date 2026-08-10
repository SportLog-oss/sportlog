import Link from "next/link";
import { BarChart3, Dumbbell, Link2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { TodayResponse } from "@/lib/today";

export function TodayTrainingOverviewCard({ today }: { today: TodayResponse }) {
  const plan = today.plannedSessions[0];
  const comparison = today.comparison;
  const cardTitle = today.displayMode === "morning" ? "Heute geplant" : "Heutiges Ergebnis";

  return (
    <Card title={cardTitle} action={<Link href="/planung" className="text-xs font-semibold text-accent hover:underline">Wochenplan öffnen</Link>}>
      {!plan ? (
        <Link href="/planung" className="block rounded-xl border border-dashed border-border p-5 text-sm text-muted hover:border-accent/40 hover:text-accent">Einheit für heute planen</Link>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised p-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent"><Dumbbell size={23} /></span>
            <div className="min-w-0 flex-1"><p className="font-semibold">{plan.title}</p><p className="mt-1 text-xs text-muted">{plan.plannedDurationMin ? `${plan.plannedDurationMin} min` : "Dauer offen"}{plan.timeOfDay ? " · Flexibel" : ""}</p></div>
          </div>
          {comparison && <>
            <div className="relative z-10 -my-5 flex justify-center"><span className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/40 bg-surface text-accent"><Link2 size={14} /></span></div>
            <Link href={`/training/${comparison.activityId}`} className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised p-4 hover:border-accent/30">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-background text-muted"><BarChart3 size={23} /></span>
              <div className="min-w-0 flex-1"><p className="font-semibold">Garmin · {comparison.title}</p><p className="mt-1 text-xs text-muted">{comparison.actualMinutes} min{comparison.rpe ? ` · RPE ${comparison.rpe}/10` : ""}{comparison.feeling ? ` · Gefühl ${comparison.feeling}` : ""}</p></div>
            </Link>
            <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-background/40 p-3 text-center">
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Geplant</p><p className="mt-1 font-semibold">{comparison.plannedMinutes ?? "–"} min</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Tatsächlich</p><p className="mt-1 font-semibold text-accent">{comparison.actualMinutes} min</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-muted">Abweichung</p><p className="mt-1 font-semibold text-positive">{comparison.deviationMinutes > 0 ? "+" : ""}{comparison.deviationMinutes} min</p></div>
            </div>
          </>}
        </div>
      )}
    </Card>
  );
}
