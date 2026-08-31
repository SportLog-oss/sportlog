import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Activity, ArrowRight, CalendarDays, ChevronRight, Heart, Moon, Sparkles } from "lucide-react";
import { buildTodayResponse, greetingForDate, recoveryZustandStatus, sleepZustandStatus, loadZustandStatus, ZUSTAND_STATUS_COLOR, type ZustandStatus } from "@/lib/today";
import type { CalendarEvent } from "@/lib/types";
import { WarningBanner } from "@/components/ui/WarningBanner";
import { PageShell } from "@/components/layout/PageShell";
import { TodayTrainingOverviewCard } from "@/components/dashboard/TodayTrainingOverviewCard";

export default async function TodayPage() {
  const today = await buildTodayResponse();
  const matchedSessionCount = today.comparisons.filter((comparison) => comparison.status === "matched").length;
  const partialTrainingDay = matchedSessionCount > 0 && matchedSessionCount < today.comparisons.length;
  const recovery = today.stats.recoveryPct ?? 0;
  const sleep = today.stats.sleepPerformance ?? 0;
  const sleepOverPct = today.stats.sleepPerformance !== null && today.stats.sleepPerformance > 100 ? Math.round(today.stats.sleepPerformance - 100) : null;
  const reflectedLoads = today.comparisons.flatMap((comparison) => comparison.rpe === null ? [] : [comparison.rpe]);
  const load = reflectedLoads.length > 0 ? Math.max(...reflectedLoads) : Math.min(10, today.stats.strain / 2.1);
  const decisionLabel = partialTrainingDay ? "Tagesfortschritt" : today.displayMode === "morning" ? "Tagesentscheidung" : today.displayMode === "post_training" ? "Trainingsergebnis" : "Tagesabschluss";
  const decisionTitle = partialTrainingDay ? `${matchedSessionCount} von ${today.comparisons.length} Einheiten eingeordnet` : today.decision.title;
  const decisionSummary = partialTrainingDay ? `Für ${today.comparisons.length - matchedSessionCount} Einheit${today.comparisons.length - matchedSessionCount === 1 ? "" : "en"} fehlt noch ein passendes Ergebnis oder die Zuordnung. Der Trainingstag bleibt bis dahin offen.` : today.decision.summary;
  const decisionColor = partialTrainingDay ? "var(--muted)" : ZUSTAND_STATUS_COLOR[decisionStatusColor(today.decision.status)];

  return (
    <PageShell title={`${greetingForDate()}, Marcel!`} subtitle={new Date(`${today.date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}>
      <section className="rounded-2xl border border-border bg-surface p-5 md:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ZustandTile href="/heute/erholung" icon={Heart} title="Erholung" value={`${Math.round(recovery)}%`} status={today.stats.recoveryPct !== null ? stateLabel(recovery) : "Keine Daten"} progress={recovery} zustand={recoveryZustandStatus(today.stats.recoveryPct)} />
          <ZustandTile href="/heute/schlaf" icon={Moon} title="Schlaf" value={`${Math.round(Math.min(100, sleep))}%`} status={today.stats.sleepPerformance !== null ? stateLabel(sleep) : "Keine Daten"} note={sleepOverPct !== null ? `+${sleepOverPct} % über Bedarf` : undefined} progress={sleep} zustand={sleepZustandStatus(today.stats.sleepPerformance)} />
          <ZustandTile href="/heute/belastung" icon={Activity} title="Belastung" value={`${load.toFixed(load % 1 === 0 ? 0 : 1)}/10`} status={load < 4 ? "Leicht" : load < 8 ? "Mäßig" : "Hoch"} progress={load * 10} zustand={loadZustandStatus(load)} />
        </div>

        <div className="mt-5 flex flex-col gap-5 border-t border-border pt-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent"><Sparkles size={11} /> KI-Einschätzung</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">{decisionLabel}</span>
            </div>
            <h2 className="text-xl font-semibold leading-snug" style={{ color: decisionColor }}>{decisionTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/85">{decisionSummary}</p>
            {today.reasons.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {today.reasons.map((reason, index) => (
                  <span key={index} className="rounded-full border border-border px-3 py-1 text-xs text-foreground/75">{reason.detail}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Nächste Aktion</span>
            <Link href={today.journey.href} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-black hover:opacity-90">{today.journey.actionLabel} <ArrowRight size={16} /></Link>
            <span className="max-w-[220px] text-right text-xs text-muted">{today.journey.detail}</span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div id="ergebnis">
          <TodayTrainingOverviewCard today={today} />
        </div>
        {today.nextCalendarEvent ? (
          <CalendarCard event={today.nextCalendarEvent} todayKey={today.date} />
        ) : (
          <section className="flex items-start gap-3 rounded-2xl border border-dashed border-border bg-surface/60 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted"><CalendarDays size={18} /></span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Kalender</p>
              <p className="mt-1 text-sm text-muted">Kein anstehender sportrelevanter Termin gefunden.</p>
            </div>
          </section>
        )}
      </div>

      {today.warnings.length > 0 && <section className="space-y-3"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Wichtige Hinweise</h2>{today.warnings.map((warning, index) => <WarningBanner key={index} warning={warning} />)}</section>}
    </PageShell>
  );
}

function decisionStatusColor(status: "insufficient_data" | "focus" | "adjust" | "clarify" | "planned"): ZustandStatus {
  if (status === "planned") return "good";
  if (status === "focus" || status === "insufficient_data") return "watch";
  return "risk";
}

const CALENDAR_CATEGORY_KEYWORDS: { keyword: string; label: string }[] = [
  { keyword: "physio", label: "Physio" },
  { keyword: "reha", label: "Reha" },
  { keyword: "training", label: "Training" },
];

function calendarCategoryLabel(title: string): string {
  const lower = title.toLowerCase();
  return CALENDAR_CATEGORY_KEYWORDS.find((c) => lower.includes(c.keyword))?.label ?? "Sport";
}

function CalendarCard({ event, todayKey }: { event: CalendarEvent; todayKey: string }) {
  const category = calendarCategoryLabel(event.title);
  const isToday = event.startsAt.slice(0, 10) === todayKey || new Date(event.startsAt).toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" }) === todayKey;
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent-soft text-accent"><CalendarDays size={19} /></span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Kalender · {category}</p>
          <p className="mt-1 truncate text-base font-semibold text-foreground/95">{event.title || "Termin ohne Titel"}</p>
          <p className="mt-0.5 text-xs text-muted">{calendarEventTiming(event, todayKey)}</p>
        </div>
      </div>
      {isToday && (
        <Link href="#ergebnis" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">Zu Heutigem Ergebnis <ChevronRight size={13} /></Link>
      )}
      <p className="mt-4 border-t border-border pt-3 text-[11px] text-muted">Nur sportrelevante Termine · nur Ansicht</p>
    </section>
  );
}

function stateLabel(value: number) {
  if (value < 40) return "Niedrig";
  if (value < 70) return "Mäßig";
  if (value < 100) return "Gut";
  return "Sehr gut";
}

function calendarEventTiming(event: CalendarEvent, todayKey: string) {
  if (event.allDay) {
    const dateLabel = new Date(`${event.startsAt.slice(0, 10)}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
    return `Ganztägig · ${dateLabel}`;
  }
  const start = new Date(event.startsAt);
  const sameDay = start.toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" }) === todayKey;
  const timeLabel = start.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Heute, ${timeLabel} Uhr`;
  const dateLabel = start.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", weekday: "long", day: "numeric", month: "long" });
  return `${dateLabel}, ${timeLabel} Uhr`;
}

function ZustandTile({ href, icon: Icon, title, value, status, note, progress, zustand }: { href: string; icon: LucideIcon; title: string; value: string; status: string; note?: string; progress: number; zustand: ZustandStatus }) {
  const color = ZUSTAND_STATUS_COLOR[zustand];
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const arc = circumference * 0.78;
  const filled = arc * Math.max(0, Math.min(100, progress)) / 100;
  return (
    <Link href={href} className="flex min-w-0 flex-col items-center gap-1 rounded-xl border border-border bg-background/35 px-1 py-3 text-center transition-colors hover:border-accent/40 sm:flex-row sm:gap-3 sm:px-3 sm:py-4 sm:text-left">
      <div className="relative h-14 w-14 shrink-0">
        <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-[130deg]">
          <circle cx="28" cy="28" r={radius} fill="none" stroke="var(--border)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${arc} ${circumference - arc}`} />
          <circle cx="28" cy="28" r={radius} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${filled} ${circumference - filled}`} />
        </svg>
        <Icon size={21} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-foreground" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <p className="text-[10px] text-muted sm:text-xs">{title}</p>
          <ChevronRight size={13} className="hidden text-muted sm:block" />
        </div>
        <p className="text-xl font-semibold leading-tight sm:text-2xl">{value}</p>
        <p className="mt-0.5 text-[10px] font-semibold sm:text-xs" style={{ color }}>{status}</p>
        {note && <p className="text-[10px] text-muted sm:text-xs">{note}</p>}
      </div>
    </Link>
  );
}
