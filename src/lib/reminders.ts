import { getActivities, getIllnessLog, getMentalHealthCheckins, getTrainingLogEntries } from "@/lib/data/store";
import type { ReminderPreferences, ReminderType } from "@/lib/types";

export interface ReminderCandidate {
  type: ReminderType;
  title: string;
  message: string;
}

const STALE_ILLNESS_UPDATE_DAYS = 3;

/**
 * Evaluates which reminder types currently have something worth nudging the user about,
 * skipping types that were already sent today or aren't enabled. Ordered by priority —
 * the caller sends at most one push per invocation to stay "sinnvoll und nicht störend".
 */
export async function evaluatePendingReminders(prefs: ReminderPreferences, todayStr: string): Promise<ReminderCandidate[]> {
  const candidates: ReminderCandidate[] = [];
  const isEnabled = (t: ReminderType) => prefs.enabledTypes.includes(t) && prefs.lastSent[t] !== todayStr;

  if (isEnabled("log-training")) {
    const { activities } = await getActivities();
    const todaysActivities = activities.filter(
      (a) => new Date(a.startTimeInSeconds * 1000).toISOString().slice(0, 10) === todayStr
    );
    if (todaysActivities.length > 0) {
      const logs = await getTrainingLogEntries();
      const unlogged = todaysActivities.filter((a) => !logs.some((l) => l.activityId === a.activityId));
      if (unlogged.length > 0) {
        candidates.push({
          type: "log-training",
          title: "Training protokollieren",
          message:
            unlogged.length === 1
              ? `Du hast "${unlogged[0].activityName}" heute noch nicht protokolliert — Schmerzen, RPE, Notizen?`
              : `Du hast ${unlogged.length} Einheiten heute noch nicht protokolliert.`,
        });
      }
    }
  }

  if (isEnabled("log-pain")) {
    const logs = await getTrainingLogEntries();
    const withPain = [...logs].filter((l) => l.pain.length > 0 || l.injury).sort((a, b) => b.date.localeCompare(a.date));
    const latestPain = withPain[0];
    if (latestPain) {
      const daysSince = (Date.now() - new Date(latestPain.date).getTime()) / 86_400_000;
      const hasNewerCheckin = logs.some((l) => l.date > latestPain.date);
      // Only nudge for a pain report that's a few days old and hasn't been followed up on yet —
      // not today's (that's log-training's job) and not indefinitely (stops being "current").
      if (daysSince >= 1 && daysSince <= 5 && !hasNewerCheckin) {
        candidates.push({
          type: "log-pain",
          title: "Schmerzen erfassen",
          message: `Du hattest zuletzt am ${latestPain.date} Schmerzen oder eine Verletzung vermerkt — wie ist der aktuelle Stand?`,
        });
      }
    }
  }

  if (isEnabled("update-illness")) {
    const illness = await getIllnessLog();
    const stale = illness.filter((i) => {
      if (i.endDate) return false;
      const daysSinceUpdate = (Date.now() - new Date(i.updatedAt).getTime()) / 86_400_000;
      return daysSinceUpdate >= STALE_ILLNESS_UPDATE_DAYS;
    });
    if (stale.length > 0) {
      candidates.push({
        type: "update-illness",
        title: "Krankheitsstatus aktualisieren",
        message: "Du hast eine aktive Krankheit/Verletzung erfasst — ist sie noch aktuell oder kannst du sie abschließen?",
      });
    }
  }

  if (isEnabled("log-mental-health")) {
    const checkins = await getMentalHealthCheckins();
    const hasToday = checkins.some((c) => c.timestamp.slice(0, 10) === todayStr);
    if (!hasToday) {
      candidates.push({
        type: "log-mental-health",
        title: "Mentaler Check-in",
        message: "Wie fühlst du dich heute? Trag kurz deine Stimmung ein.",
      });
    }
  }

  // Generic daily nudge — only fires if nothing more specific already applies, to avoid stacking pushes.
  if (isEnabled("daily-checkin") && candidates.length === 0) {
    candidates.push({
      type: "daily-checkin",
      title: "Tagescheck",
      message: "Kurzer Check-in: Wie war dein Tag, wie fühlst du dich körperlich und mental?",
    });
  }

  return candidates;
}
