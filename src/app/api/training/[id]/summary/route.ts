import { NextResponse } from "next/server";
import {
  getOpenRouterClient,
  COACH_MODEL,
  COACH_MODEL_FALLBACK,
  createChatCompletionWithFallback,
  friendlyOpenRouterError,
} from "@/lib/openrouter";
import { getActivities, getIllnessLog, getTrainingLogEntries, getDailyMetrics } from "@/lib/data/store";
import { stripMarkdown } from "@/lib/textFormat";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activityId = Number(id);

  const openrouter = getOpenRouterClient();
  if (!openrouter) {
    return NextResponse.json({ error: "Kein OPENROUTER_API_KEY konfiguriert." }, { status: 503 });
  }

  const { activities } = await getActivities();
  const activity = activities.find((a) => a.activityId === activityId);
  if (!activity) return NextResponse.json({ error: "Aktivität nicht gefunden." }, { status: 404 });

  const [illnessLog, trainingLogEntries, daily] = await Promise.all([
    getIllnessLog(),
    getTrainingLogEntries(),
    getDailyMetrics(),
  ]);

  const activeIllness = illnessLog.filter((i) => !i.endDate);
  const logEntry = trainingLogEntries.find((e) => e.activityId === activityId);
  const last7 = daily.rows.slice(-7);
  const recentLoadLine = last7
    .map((r) => `${r.date}: Load ${r.dailyLoad ?? "–"}, TSB ${r.tsb ?? "–"}`)
    .join("; ");

  const prompt = `Analysiere folgende einzelne Trainingseinheit eines Leistungssportlers kurz und konkret auf Deutsch. Gliedere in vier kurze Abschnitte als Klartext-Zeilen (keine Markdown-Formatierung, keine Sternchen, keine Überschriften mit #): "Was lief gut", "Auffälligkeiten", "Belastung & Erholung", "Verbesserungsvorschläge". Halte dich kurz (max. 5-6 Sätze insgesamt).

Einheit: ${activity.activityName} (${activity.activityType}), ${new Date(activity.startTimeInSeconds * 1000).toISOString().slice(0, 10)}
Dauer: ${Math.round(activity.durationInSeconds / 60)} min, Distanz: ${(activity.distanceInMeters / 1000).toFixed(1)} km
Ø HF: ${activity.averageHeartRateInBeatsPerMinute ?? "–"}, Max HF: ${activity.maxHeartRateInBeatsPerMinute ?? "–"}
Trainingsbelastung (Load): ${activity.trainingLoad ?? "–"}
${activity.avgPower ? `Ø Leistung: ${activity.avgPower} W, IF: ${activity.intensityFactor ?? "–"}` : ""}

Trainingsprotokoll zu dieser Einheit: ${
    logEntry
      ? `Schmerzen: ${logEntry.pain.map((p) => `${p.bodyPart} ${p.intensity}/10`).join(", ") || "keine"}${logEntry.injury ? " (Verletzung markiert!)" : ""}, Muskelkater ${logEntry.soreness ?? "–"}/10, RPE ${logEntry.rpe ?? "–"}/10. ${logEntry.notes || ""}`
      : "kein Protokoll erfasst"
  }

Aktive Krankheit/Verletzung: ${activeIllness.length > 0 ? activeIllness.map((i) => i.symptoms.join(", ")).join("; ") : "keine"}

Belastungstrend letzte 7 Tage: ${recentLoadLine || "keine Daten"}`;

  try {
    const response = await createChatCompletionWithFallback(
      openrouter,
      { max_tokens: 600, messages: [{ role: "user", content: prompt }] },
      { primary: COACH_MODEL, fallback: COACH_MODEL_FALLBACK }
    );
    const summary = stripMarkdown(response.choices[0]?.message?.content ?? "");
    return NextResponse.json({ summary });
  } catch (error) {
    const { message, status } = friendlyOpenRouterError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
