import { NextRequest, NextResponse } from "next/server";
import { getReminderPreferences, saveReminderPreferences } from "@/lib/data/store";
import { evaluatePendingReminders } from "@/lib/reminders";
import { sendPushToAll } from "@/lib/push";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Vercel's Hobby plan only allows cron jobs to run once per day, so this can't actually
  // fire at each user's `preferredHour` — it runs once daily (see vercel.json) and evaluates
  // immediately. `preferredHour` is still stored/exposed in the UI for when reminder delivery
  // moves to a scheduler that supports it (e.g. a Pro-plan hourly cron, or a queue).
  const now = new Date();
  const prefs = await getReminderPreferences();
  const todayStr = now.toISOString().slice(0, 10);
  const candidates = await evaluatePendingReminders(prefs, todayStr);

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, sent: false, reason: "nothing pending" });
  }

  const chosen = candidates[0];
  const pushResult = await sendPushToAll(chosen.title, chosen.message);

  await saveReminderPreferences({ ...prefs, lastSent: { ...prefs.lastSent, [chosen.type]: todayStr } });

  return NextResponse.json({ ok: true, sent: true, reminder: chosen, pushResult });
}
