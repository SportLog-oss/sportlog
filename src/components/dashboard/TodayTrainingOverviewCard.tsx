import Link from "next/link";
import { BarChart3, Dumbbell, Link2, Waves } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { TodayResponse } from "@/lib/today";

export function TodayTrainingOverviewCard({ today }: { today: TodayResponse }) {
  const cardTitle = today.displayMode === "morning" ? "Heute geplant" : "Heutiges Ergebnis";

  return (
    <Card title={cardTitle} action={<Link href="/planung" className="text-xs font-semibold text-accent hover:underline">Wochenplan öffnen</Link>}>
      {today.comparisons.length === 0 ? (
        <Link href="/planung" className="block rounded-xl border border-dashed border-border p-5 text-sm text-muted hover:border-accent/40 hover:text-accent">Einheit für heute planen</Link>
      ) : (
        <div className="space-y-4">
          {today.comparisons.map((comparison, index) => {
            const SportIcon = comparison.plannedSportType === "rowing" ? Waves : Dumbbell;
            return (
              <section key={comparison.plannedSessionId} className="rounded-2xl border border-border bg-background/25 p-3">
                {today.comparisons.length > 1 && (
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                    Einheit {index + 1} von {today.comparisons.length}
                  </p>
                )}
                <div className="flex items-center gap-3 rounded-xl bg-surface-raised p-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent"><SportIcon size={22} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{comparison.plannedTitle}</p>
                    <p className="mt-1 text-xs text-muted">{comparison.plannedMinutes ? `${comparison.plannedMinutes} min` : "Dauer offen"}</p>
                  </div>
                  {comparison.status === "planned" && <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted">Noch offen</span>}
                </div>

                {comparison.status === "matched" && comparison.actualMinutes !== null && (
                  <>
                    <div className="relative z-10 -my-4 flex justify-center"><span className="flex h-7 w-7 items-center justify-center rounded-full border border-accent/40 bg-surface text-accent"><Link2 size={13} /></span></div>
                    {comparison.activityId !== null && (
                      <Link href={`/training/${comparison.activityId}`} className="flex items-center gap-3 rounded-xl border border-accent/30 bg-surface-raised p-4 hover:border-accent/60">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-background text-muted"><BarChart3 size={22} /></span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">Garmin · {comparison.activityTitle}</p>
                          <p className="mt-1 text-xs text-muted">{comparison.actualMinutes} min{comparison.rpe ? ` · RPE ${comparison.rpe}/10` : ""}{comparison.feeling ? ` · Gefühl ${comparison.feeling}` : ""}</p>
                        </div>
                      </Link>
                    )}
                    <div className="mt-3 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-background/40 p-3 text-center">
                      <div><p className="text-[10px] uppercase tracking-wide text-muted">Geplant</p><p className="mt-1 font-semibold">{comparison.plannedMinutes ?? "–"} min</p></div>
                      <div><p className="text-[10px] uppercase tracking-wide text-muted">Tatsächlich</p><p className="mt-1 font-semibold text-accent">{comparison.actualMinutes} min</p></div>
                      <div><p className="text-[10px] uppercase tracking-wide text-muted">Abweichung</p><p className="mt-1 font-semibold text-positive">{comparison.deviationMinutes !== null && comparison.deviationMinutes > 0 ? "+" : ""}{comparison.deviationMinutes ?? "–"} min</p></div>
                    </div>
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}
    </Card>
  );
}
