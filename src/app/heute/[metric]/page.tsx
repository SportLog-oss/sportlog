import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { buildZustandDetail, type ZustandMetric } from "@/lib/zustandDetail";
import { buildTodayResponse, ZUSTAND_STATUS_COLOR } from "@/lib/today";

const METRICS: ZustandMetric[] = ["erholung", "schlaf", "belastung"];

export default async function ZustandDetailPage({ params }: { params: Promise<{ metric: string }> }) {
  const { metric } = await params;
  if (!METRICS.includes(metric as ZustandMetric)) notFound();

  const [detail, today] = await Promise.all([buildZustandDetail(metric as ZustandMetric), buildTodayResponse()]);
  if (!detail) notFound();

  const color = ZUSTAND_STATUS_COLOR[detail.status];
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = (circumference * Math.min(100, Math.max(0, detail.value))) / 100;
  const maxTrend = Math.max(1, ...detail.trend.map((t) => t.value));

  return (
    <PageShell
      title={detail.label}
      subtitle={detail.subtitle}
      action={
        <Link href="/" className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted hover:border-accent/40 hover:text-accent">
          <ArrowLeft size={13} /> Zurück zu Heute
        </Link>
      }
    >
      <section className="flex flex-wrap items-center gap-8 rounded-2xl border border-border bg-surface p-6 sm:p-7">
        <div className="relative h-[140px] w-[140px] shrink-0">
          <svg viewBox="0 0 120 120" className="h-[140px] w-[140px] -rotate-90">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--border)" strokeWidth="9" />
            <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${filled} ${circumference - filled}`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold leading-none">{detail.value}</span>
            <span className="mt-1 text-xs text-muted">{detail.unit}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color }}>
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
            {detail.statusLabel}
          </div>
          <h2 className="text-xl font-semibold leading-snug sm:text-2xl">{detail.headline}</h2>
        </div>
      </section>

      {detail.trend.length > 1 && (
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold">Verlauf · {detail.trend.length} Tage</h3>
          <div className="flex h-40 items-end gap-2 border-b border-border pb-1">
            {detail.trend.map((point, index) => (
              <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-[11px] text-muted">{Math.round(point.value)}</span>
                <div className="w-full rounded-t-md" style={{ height: `${Math.max(4, (point.value / maxTrend) * 100)}%`, background: ZUSTAND_STATUS_COLOR[point.status] }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            {detail.trend.map((point, index) => (
              <div key={index} className="flex-1 text-center text-[11px] text-muted">{point.day}</div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        {detail.factors.length > 0 && (
          <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h3 className="text-sm font-semibold">Was in den Wert einfließt</h3>
            <div className="mt-5 space-y-4">
              {detail.factors.map((factor) => (
                <div key={factor.name} className="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[160px_1fr_auto]">
                  <div>
                    <p className="text-sm font-medium">{factor.name}</p>
                    <p className="text-xs text-muted">{factor.value}</p>
                  </div>
                  <div className="col-span-2 h-2 overflow-hidden rounded-full bg-background sm:col-span-1">
                    <div className="h-full rounded-full" style={{ width: `${factor.width}%`, background: ZUSTAND_STATUS_COLOR[factor.status] }} />
                  </div>
                  <div className="text-right text-xs font-semibold" style={{ color: ZUSTAND_STATUS_COLOR[factor.status] }}>{factor.delta}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
              <Sparkles size={12} /> KI-Einschätzung
            </div>
            <p className="text-sm leading-relaxed text-foreground/85">{detail.coachText}</p>
          </div>
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Nächste Aktion</p>
            <Link href={today.journey.href} className="flex w-fit items-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-black hover:opacity-90">
              {today.journey.actionLabel} <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
