import { NextResponse } from "next/server";
import {
  getOpenRouterClient,
  COACH_MODEL,
  COACH_MODEL_FALLBACK,
  createChatCompletionWithFallback,
  friendlyOpenRouterError,
} from "@/lib/openrouter";
import { getActivities, getIllnessLog, getTrainingLogEntries, getDailyMetrics } from "@/lib/data/store";
import { stripMarkdown, extractJson } from "@/lib/textFormat";

export interface ActivitySummarySections {
  summary: string;
  load: string;
  recovery: string;
  suggestions: string;
}

// Weaker free-tier fallback models occasionally emit near-JSON with a missing quote or comma
// (e.g. `loads":"..."` instead of `"load":"..."`) that JSON.parse rejects outright — a per-field
// regex pass recovers the four sections in that case instead of falling all the way back to
// showing the broken raw JSON string as prose.
function looseExtractField(raw: string, field: string): string | null {
  const match = raw.match(new RegExp(`"?${field}"?\\s*:\\s*"([^"]*)"`, "i"));
  return match ? match[1] : null;
}

function parseSummary(raw: string): ActivitySummarySections | null {
  const jsonText = extractJson(raw);
  try {
    const parsed = JSON.parse(jsonText);
    if (
      typeof parsed.summary !== "string" ||
      typeof parsed.load !== "string" ||
      typeof parsed.recovery !== "string" ||
      typeof parsed.suggestions !== "string"
    ) {
      return null;
    }
    return {
      summary: stripMarkdown(parsed.summary),
      load: stripMarkdown(parsed.load),
      recovery: stripMarkdown(parsed.recovery),
      suggestions: stripMarkdown(parsed.suggestions),
    };
  } catch {
    const summary = looseExtractField(jsonText, "summary");
    const load = looseExtractField(jsonText, "load");
    const recovery = looseExtractField(jsonText, "recovery");
    const suggestions = looseExtractField(jsonText, "suggestions");
    if (!summary || !load || !recovery || !suggestions) return null;
    return {
      summary: stripMarkdown(summary),
      load: stripMarkdown(load),
      recovery: stripMarkdown(recovery),
      suggestions: stripMarkdown(suggestions),
    };
  }
}

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

  const prompt = `Analysiere folgende einzelne Trainingseinheit eines Leistungssportlers kurz und konkret auf Deutsch. Antworte ausschließlich mit einem JSON-Objekt (kein Markdown, keine Codeblöcke, keine Sternchen) mit genau diesen vier String-Feldern:
{"summary": "was lief gut / Auffälligkeiten, 1-2 Sätze", "load": "Einschätzung der Trainingsbelastung dieser Einheit, 1-2 Sätze", "recovery": "Einschätzung von Erholungsbedarf/-status, 1-2 Sätze", "suggestions": "konkrete Verbesserungsvorschläge, 1-2 Sätze"}

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
    const raw = response.choices[0]?.message?.content ?? "";
    const sections = parseSummary(raw);
    if (!sections) {
      // Fall back to the raw text in all four fields rather than failing outright — still
      // usable, just not split into sections, if the model ignored the JSON instruction.
      const fallback = stripMarkdown(raw);
      return NextResponse.json({ summary: fallback, load: "", recovery: "", suggestions: "" });
    }
    return NextResponse.json(sections);
  } catch (error) {
    const { message, status } = friendlyOpenRouterError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
