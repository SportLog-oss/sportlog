import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import type { TodayResponse } from "@/lib/today";

export function TodayJourneyCard({ journey }: { journey: TodayResponse["journey"] }) {
  return (
    <section className="grid h-full gap-5 rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-raised/60 p-5 md:grid-cols-[1fr_auto] md:p-6">
      <div className="flex min-w-0 flex-col justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Dein nächster Schritt</p>
          <h2 className="mt-3 text-xl font-semibold">{journey.title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{journey.detail}</p>
        </div>
        <Link href={journey.href} className="mt-5 flex w-fit items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-black shadow-[0_0_28px_rgba(37,216,207,0.14)] hover:opacity-90">
          {journey.actionLabel}<ArrowRight size={16} />
        </Link>
      </div>
      <div className="hidden h-24 w-24 self-center items-center justify-center rounded-full border border-accent/35 bg-background/30 text-accent/70 shadow-[0_0_36px_rgba(37,216,207,0.08)] md:flex">
        <Activity size={46} strokeWidth={1.4} />
      </div>
    </section>
  );
}
