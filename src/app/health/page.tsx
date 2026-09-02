import { getIllnessLog } from "@/lib/data/store";
import { getPlannedSessionsInRange } from "@/lib/data/planningStore";
import { addDays } from "@/lib/planning";
import { localDateKey } from "@/lib/today";
import { PageShell } from "@/components/layout/PageShell";
import { HealthTabs } from "@/components/health/HealthTabs";

export default async function HealthPage() {
  const illnessEntries = await getIllnessLog();
  const today = localDateKey(new Date());

  // Candidate window for the Krankheit/Schmerzen-Verlauf-Verknüpfung (Konzept 005, Ergänzung 3):
  // spans every illness entry's date range, padded ±14 days so a manual correction can also pick
  // a session slightly outside the automatic match window.
  const earliestStart = illnessEntries.reduce((min, entry) => (entry.startDate < min ? entry.startDate : min), today);
  const latestEnd = illnessEntries.reduce((max, entry) => ((entry.endDate ?? today) > max ? entry.endDate ?? today : max), today);
  const sessions = await getPlannedSessionsInRange(addDays(earliestStart, -14), addDays(latestEnd, 14));

  return (
    <PageShell title="Gesundheit" subtitle="Rückblick — was war, nicht was heute zu tun ist">
      <HealthTabs sessions={sessions} />
    </PageShell>
  );
}
