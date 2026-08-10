import Link from "next/link";
import { CalendarPlus, CheckCircle2, CircleOff, Clock3, Dumbbell, Footprints, Waves } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { PlannedSession } from "@/lib/planning";

const TIME_LABELS: Record<string, string> = { morning: "Morgens", midday: "Mittags", afternoon: "Nachmittags", evening: "Abends", custom: "Flexibel" };

function SessionIcon({ sportType }: { sportType: string }) {
  const normalized = sportType.toLowerCase();
  if (normalized.includes("ruder") || normalized.includes("schwimm")) return <Waves size={18} />;
  if (normalized.includes("lauf") || normalized.includes("walk")) return <Footprints size={18} />;
  return <Dumbbell size={18} />;
}

export function TodayPlannedSessionsCard({ sessions }: { sessions: PlannedSession[] }) {
  return (
    <Card title="Heute geplant" action={<Link href="/planung" className="text-xs font-semibold text-accent hover:underline">Wochenplan öffnen</Link>}>
      {sessions.length === 0 ? (
        <Link href="/planung" className="flex items-start gap-3 rounded-xl bg-surface-raised p-4 hover:bg-accent-soft">
          <CalendarPlus size={18} className="mt-0.5 shrink-0 text-muted" />
          <div><p className="text-sm font-semibold">Noch keine geplante Einheit</p><p className="mt-1 text-sm text-muted">Plane die nächste sinnvolle Einheit in deiner Trainingswoche.</p></div>
        </Link>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <Link key={session.id} href="/planung" className="flex items-center gap-3 rounded-xl bg-surface-raised p-4 hover:bg-accent-soft">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><SessionIcon sportType={session.sportType} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{session.title}</p>{session.status === "completed" && <CheckCircle2 size={15} className="text-positive" />}{session.status === "changed" && <CircleOff size={15} className="text-warning" />}</div>
                <p className="mt-1 text-xs text-muted">{session.sportType}{session.plannedDurationMin ? ` · ${session.plannedDurationMin} min` : ""}{session.timeOfDay ? ` · ${TIME_LABELS[session.timeOfDay]}` : ""}</p>
                {(session.technicalFocus || session.description) && <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{session.technicalFocus || session.description}</p>}
              </div>
              <Clock3 size={16} className="shrink-0 text-muted" />
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
