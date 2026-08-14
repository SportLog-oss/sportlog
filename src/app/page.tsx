import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, CircleHelp, Heart, HeartPulse, Moon, Target } from "lucide-react";
import { buildTodayResponse, greetingForDate } from "@/lib/today";
import { Card } from "@/components/ui/Card";
import { WarningBanner } from "@/components/ui/WarningBanner";
import { PageShell } from "@/components/layout/PageShell";
import { TodayTrainingOverviewCard } from "@/components/dashboard/TodayTrainingOverviewCard";

export default async function TodayPage() {
  const today = await buildTodayResponse();
  const matchedSessionCount = today.comparisons.filter((comparison) => comparison.status === "matched").length;
  const partialTrainingDay = matchedSessionCount > 0 && matchedSessionCount < today.comparisons.length;
  const DecisionIcon = partialTrainingDay ? Activity : today.decision.status === "clarify" ? AlertTriangle : today.decision.status === "planned" ? CheckCircle2 : CircleHelp;
  const recovery = today.stats.recoveryPct ?? 0;
  const sleep = today.stats.sleepPerformance ?? 0;
  const reflectedLoads = today.comparisons.flatMap((comparison) => comparison.rpe === null ? [] : [comparison.rpe]);
  const load = reflectedLoads.length > 0 ? Math.max(...reflectedLoads) : Math.min(10, today.stats.strain / 2.1);
  const healthIssue = today.reasons.some((reason) => reason.label === "Gesundheit");
  const decisionLabel = partialTrainingDay ? "Tagesfortschritt" : today.displayMode === "morning" ? "Tagesentscheidung" : today.displayMode === "post_training" ? "Trainingsergebnis" : "Tagesabschluss";
  const decisionTitle = partialTrainingDay ? `${matchedSessionCount} von ${today.comparisons.length} Einheiten eingeordnet` : today.decision.title;
  const decisionSummary = partialTrainingDay ? `Für ${today.comparisons.length - matchedSessionCount} Einheit${today.comparisons.length - matchedSessionCount === 1 ? "" : "en"} fehlt noch ein passendes Ergebnis oder die Zuordnung. Der Trainingstag bleibt bis dahin offen.` : today.decision.summary;
  const focusLabel = partialTrainingDay ? "Nächster Schritt" : today.displayMode === "morning" ? "Fokus heute" : today.displayMode === "post_training" ? "Nach dem Training" : "Für heute Abend";
  const focus = healthIssue ? today.focus : partialTrainingDay ? "Offene Einheit absolvieren oder das passende Garmin-Training im Wochenplan zuordnen." : today.displayMode === "evening" ? "Für heute bist du fertig. Jetzt zählt Erholung – morgen bewertet SportLog deine neuen Signale erneut." : today.displayMode === "post_training" ? "Trainingsergebnis kurz prüfen und nur relevante Beschwerden oder Abweichungen ergänzen." : today.focus;
  const nextDate = today.nextPlannedSession ? new Date(`${today.nextPlannedSession.scheduledDate}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }) : null;
  const tomorrow = new Date(`${today.date}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const nextTiming = today.nextPlannedSession?.scheduledDate === tomorrow.toISOString().slice(0, 10) ? "Morgen" : nextDate;
  const nextTitle = today.nextPlannedSession ? readableSessionTitle(today.nextPlannedSession.title, today.nextPlannedSession.sportType) : "Der nächste Tag ist noch offen";
  const nextDetail = today.nextPlannedSession
    ? `${nextTiming} sind ${today.nextPlannedSession.plannedDurationMin ? `${today.nextPlannedSession.plannedDurationMin} Minuten` : "eine Einheit"} ${nextTitle} geplant. ${today.stats.recoveryPct !== null ? `Deine Erholung ist aktuell ${stateLabel(recovery).toLowerCase()} (${Math.round(recovery)} %). ` : ""}Wir beobachten die Nacht und ändern den Plan nur bei neuen Signalen.`
    : "Für die nächsten Tage ist noch keine Einheit geplant. Du kannst den Plan in Ruhe ergänzen.";

  return (
    <PageShell title={`${greetingForDate()}, Marcel!`} subtitle={new Date(`${today.date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent-soft to-surface p-5 md:p-6">
          <div className="grid gap-5 sm:grid-cols-[120px_1fr] sm:items-center">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full border shadow-[0_0_38px_rgba(37,216,207,0.14)] sm:h-24 sm:w-24 ${today.decision.status === "clarify" ? "border-warning/50 text-warning" : "border-accent/60 text-accent"}`}>
              <DecisionIcon className="h-8 w-8 sm:h-12 sm:w-12" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{decisionLabel}</p>
                <span className={today.dataQuality.status === "current" ? "text-xs text-positive" : "text-xs text-warning"}>
                  {today.dataQuality.label}{today.dataQuality.ageHours !== null ? ` · ${today.dataQuality.ageHours} h` : ""}
                </span>
              </div>
              <h2 className="mt-3 text-xl font-semibold">{decisionTitle}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/85">{decisionSummary}</p>
            </div>
          </div>
        </section>

        {today.displayMode === "evening" ? (
          <ContextCard eyebrow="Als Nächstes" title={nextTitle} detail={nextDetail} actionLabel={today.nextPlannedSession ? "Nächste Einheit ansehen" : "Plan ergänzen"} href="/planung" icon={CalendarDays} />
        ) : (
          <ContextCard eyebrow={today.displayMode === "post_training" ? "Körperreaktion" : "Gesundheit heute"} title={today.displayMode === "post_training" ? "Wie hat dein Körper reagiert?" : "Wie fühlst du dich?"} detail={today.displayMode === "post_training" ? "Ergänze nur Schmerzen, ungewöhnlichen Muskelkater oder eine notwendige Trainingspause." : "Schmerzen, Krankheit oder eine notwendige Trainingspause kannst du hier direkt festhalten."} actionLabel="Befinden erfassen" href="/health?tab=krankheiten" icon={HeartPulse} />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <TodayTrainingOverviewCard today={today} />
        <div className="space-y-6">
          <Card title="Aktueller Zustand">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <CompactStateMetric icon={Heart} title="Erholung" value={`${Math.round(recovery)}%`} status={today.stats.recoveryPct !== null ? stateLabel(recovery) : "Keine Daten"} progress={recovery} color="#f6ad3c" />
              <CompactStateMetric icon={Moon} title="Schlaf" value={`${Math.round(sleep)}%`} status={today.stats.sleepPerformance !== null ? stateLabel(sleep) : "Keine Daten"} progress={sleep} color="#6793ff" statusClass="text-positive" />
              <CompactStateMetric icon={Activity} title="Belastung" value={`${load.toFixed(load % 1 === 0 ? 0 : 1)}/10`} status={load < 4 ? "Leicht" : load < 8 ? "Mäßig" : "Hoch"} progress={load * 10} color="#f6ad3c" />
            </div>
          </Card>
          <section className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent-soft text-accent"><Target size={25} /></span>
            <div><p className="text-sm font-semibold">{focusLabel}</p><p className="mt-2 text-base font-semibold leading-relaxed text-foreground/90">{focus}</p></div>
          </section>
        </div>
      </div>

      {today.warnings.length > 0 && <section className="space-y-3"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Wichtige Hinweise</h2>{today.warnings.map((warning, index) => <WarningBanner key={index} warning={warning} />)}</section>}
    </PageShell>
  );
}

function ContextCard({ eyebrow, title, detail, actionLabel, href, icon: Icon }: { eyebrow: string; title: string; detail: string; actionLabel: string; href: string; icon: LucideIcon }) {
  return (
    <section className="grid gap-5 rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-raised/60 p-5 md:grid-cols-[1fr_auto] md:p-6">
      <div className="flex min-w-0 flex-col justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-accent">{eyebrow}</p><h2 className="mt-3 text-xl font-semibold">{title}</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{detail}</p></div>
        <Link href={href} className="mt-5 flex w-fit items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-black shadow-[0_0_28px_rgba(37,216,207,0.14)] hover:opacity-90">{actionLabel} <ArrowRight size={16} /></Link>
      </div>
      <div className="hidden h-24 w-24 self-center items-center justify-center rounded-full border border-accent/35 bg-background/30 text-accent/70 shadow-[0_0_36px_rgba(37,216,207,0.08)] md:flex"><Icon size={44} strokeWidth={1.4} /></div>
    </section>
  );
}

function stateLabel(value: number) {
  if (value < 40) return "Niedrig";
  if (value < 70) return "Mäßig";
  return "Gut";
}

function readableSessionTitle(title: string, sportType: string) {
  const looksLikeCode = title.length <= 5 || /^[A-Z0-9_-]+$/.test(title);
  if (!looksLikeCode || !sportType || title.toLocaleLowerCase("de-DE") === sportType.toLocaleLowerCase("de-DE")) return title;
  return `${title} · ${sportType}`;
}

function CompactStateMetric({ icon: Icon, title, value, status, progress, color, statusClass = "text-warning" }: { icon: LucideIcon; title: string; value: string; status: string; progress: number; color: string; statusClass?: string }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const arc = circumference * 0.78;
  const filled = arc * Math.max(0, Math.min(100, progress)) / 100;
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 rounded-xl border border-border bg-background/35 px-1 py-3 text-center sm:flex-row sm:gap-3 sm:px-3 sm:py-4 sm:text-left">
      <div className="relative h-14 w-14 shrink-0">
        <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-[130deg]">
          <circle cx="28" cy="28" r={radius} fill="none" stroke="var(--border)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${arc} ${circumference - arc}`} />
          <circle cx="28" cy="28" r={radius} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${filled} ${circumference - filled}`} />
        </svg>
        <Icon size={21} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-foreground" strokeWidth={1.8} />
      </div>
      <div className="min-w-0"><p className="text-[10px] text-muted sm:text-xs">{title}</p><p className="text-xl font-semibold leading-tight sm:text-2xl">{value}</p><p className={`mt-0.5 text-[10px] font-semibold sm:text-xs ${statusClass}`}>{status}</p></div>
    </div>
  );
}
