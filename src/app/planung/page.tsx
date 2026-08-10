import { PageShell } from "@/components/layout/PageShell";
import { WeekPlanner } from "@/components/planning/WeekPlanner";
import { getPlanningWeek } from "@/lib/data/planningStore";
import { getPlanningMatches } from "@/lib/data/planningMatchStore";
import { mondayForDate } from "@/lib/planning";
import { localDateKey } from "@/lib/today";
import { getCompetitions } from "@/lib/data/store";

export default async function PlanningPage() {
  const weekStart = mondayForDate(localDateKey(new Date()));
  const [week, matches, competitions] = await Promise.all([getPlanningWeek(weekStart), getPlanningMatches(weekStart), getCompetitions()]);

  return (
    <PageShell title="Dein Trainingsplan" subtitle="Eine klare Woche. Jede Einheit mit einem Zweck.">
      <WeekPlanner initialWeek={week} initialMatches={matches} initialCompetitions={competitions.filter((competition) => competition.status === "planned")} />
    </PageShell>
  );
}
