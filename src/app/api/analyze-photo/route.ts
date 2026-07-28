import { NextRequest, NextResponse } from "next/server";
import { getOpenRouterClient, COACH_MODEL, friendlyOpenRouterError } from "@/lib/openrouter";
import { getActivities, getActivityNotes, saveActivityNotes, getBenchmarks, saveBenchmarks } from "@/lib/data/store";
import { stripMarkdown } from "@/lib/textFormat";

const ANALYSIS_PROMPT = `Du bist ein Rudersport-Coach und analysierst ein Foto eines Ergometer-Displays (Concept2 o.ä.) oder eines handschriftlichen/digitalen Trainingsprotokolls mit Ergo-Zeiten oder Intervallen.

Extrahiere so genau wie möglich:
- Gesamtdistanz und/oder Gesamtzeit
- Splits/Intervalle (Distanz oder Zeit pro Abschnitt, Pace, Schlagzahl (spm), Herzfrequenz falls sichtbar)
- Watt falls sichtbar

Danach kommentiere kurz auf Deutsch:
- Wie gleichmäßig/konsistent waren die Splits?
- Gab es auffällige Einbrüche oder Steigerungen?
- Eine kurze Einschätzung der Leistung, wenn erkennbar (ohne Übertreibung, nur basierend auf dem Sichtbaren)

Falls das Bild unleserlich ist oder keine Ergo-Daten zeigt, sage das ehrlich statt Werte zu erfinden. Antworte in normalem Fließtext ohne jegliche Markdown-Formatierung (keine Sternchen für Fett/Kursiv, keine Tabellen, keine Überschriften).

Gib GANZ AM ENDE deiner Antwort zusätzlich genau einen JSON-Block in dieser Form zurück (nur wenn eine klar erkennbare GESAMTdistanz und GESAMTzeit sichtbar sind, sonst beide Werte als null):
\`\`\`json
{"distanceMeters": <Zahl oder null>, "durationSeconds": <Zahl oder null>}
\`\`\``;

const BENCHMARK_PRESETS: { name: string; distanceMeters: number }[] = [
  { name: "350m Sprint", distanceMeters: 350 },
  { name: "1000m Dorfregatten", distanceMeters: 1000 },
  { name: "1500m B-Junior Distance", distanceMeters: 1500 },
  { name: "2000m normale Distance", distanceMeters: 2000 },
  { name: "6000m Langstrecke", distanceMeters: 6000 },
];

const ROWING_TYPES = ["ROWING_V2", "INDOOR_ROWING"];

function extractJsonBlock(text: string): { distanceMeters: number | null; durationSeconds: number | null } | null {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    return {
      distanceMeters: typeof parsed.distanceMeters === "number" ? parsed.distanceMeters : null,
      durationSeconds: typeof parsed.durationSeconds === "number" ? parsed.durationSeconds : null,
    };
  } catch {
    return null;
  }
}

function stripJsonBlock(text: string): string {
  return text.replace(/```json\s*[\s\S]*?\s*```/, "").trim();
}

export async function POST(req: NextRequest) {
  const { imageBase64, mimeType } = await req.json();
  if (!imageBase64) return NextResponse.json({ error: "imageBase64 required" }, { status: 400 });

  const openrouter = getOpenRouterClient();
  if (!openrouter) {
    return NextResponse.json(
      { error: "Kein OPENROUTER_API_KEY konfiguriert. Trage ihn in .env.local ein." },
      { status: 503 }
    );
  }

  try {
    const response = await openrouter.chat.completions.create({
      model: COACH_MODEL,
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: ANALYSIS_PROMPT },
            { type: "image_url", image_url: { url: `data:${mimeType ?? "image/jpeg"};base64,${imageBase64}` } },
          ],
        },
      ],
    });

    const rawAnalysis = response.choices[0]?.message?.content ?? "";
    const extracted = extractJsonBlock(rawAnalysis);
    const analysis = stripMarkdown(stripJsonBlock(rawAnalysis));

    let matchedActivity: { activityId: number; activityName: string; date: string } | null = null;
    let benchmarkUpdate: { name: string; value: number; isNewBest: boolean } | null = null;

    if (extracted?.distanceMeters && extracted?.durationSeconds) {
      const { distanceMeters, durationSeconds } = extracted;

      // Try to attach the analysis as a note on a matching recent rowing activity.
      try {
        const { activities } = await getActivities();
        const match = activities.find((a) => {
          if (!ROWING_TYPES.includes(a.activityType)) return false;
          const distTolerance = Math.max(50, distanceMeters * 0.05);
          const durTolerance = Math.max(30, durationSeconds * 0.05);
          return (
            Math.abs(a.distanceInMeters - distanceMeters) <= distTolerance &&
            Math.abs(a.durationInSeconds - durationSeconds) <= durTolerance
          );
        });

        if (match) {
          const notes = await getActivityNotes();
          const idx = notes.findIndex((n) => n.activityId === match.activityId);
          const noteLine = `[Ergo-Foto] ${analysis.slice(0, 500)}`;
          if (idx === -1) {
            notes.push({ activityId: match.activityId, note: noteLine, updatedAt: new Date().toISOString() });
          } else if (!notes[idx].note.includes("[Ergo-Foto]")) {
            notes[idx] = {
              ...notes[idx],
              note: `${notes[idx].note}\n\n${noteLine}`,
              updatedAt: new Date().toISOString(),
            };
          }
          await saveActivityNotes(notes);
          matchedActivity = {
            activityId: match.activityId,
            activityName: match.activityName,
            date: new Date(match.startTimeInSeconds * 1000).toISOString().slice(0, 10),
          };
        }
      } catch {
        // best-effort — analysis text is still returned even if matching fails
      }

      // Check whether this is a new personal best for one of the ergo benchmark presets.
      try {
        const preset = BENCHMARK_PRESETS.find(
          (p) => Math.abs(p.distanceMeters - distanceMeters) <= Math.max(10, p.distanceMeters * 0.02)
        );

        if (preset) {
          const benchmarks = await getBenchmarks();
          const existing = benchmarks.find((b) => b.name === preset.name);
          const currentBest = existing && existing.entries.length > 0 ? Math.min(...existing.entries.map((e) => e.value)) : null;
          const isNewBest = currentBest === null || durationSeconds < currentBest;

          if (isNewBest) {
            const today = new Date().toISOString().slice(0, 10);
            if (existing) {
              existing.entries.push({ date: today, value: durationSeconds, notes: "Aus Ergo-Foto" });
              existing.entries.sort((a, b) => a.date.localeCompare(b.date));
            } else {
              benchmarks.push({
                id: `bench-${Date.now()}`,
                name: preset.name,
                kind: "time",
                unit: "s",
                lowerIsBetter: true,
                entries: [{ date: today, value: durationSeconds, notes: "Aus Ergo-Foto" }],
                createdAt: today,
              });
            }
            await saveBenchmarks(benchmarks);
            benchmarkUpdate = { name: preset.name, value: durationSeconds, isNewBest: true };
          }
        }
      } catch {
        // best-effort — analysis text is still returned even if the benchmark update fails
      }
    }

    return NextResponse.json({ analysis, extracted, matchedActivity, benchmarkUpdate });
  } catch (error) {
    const { message, status } = friendlyOpenRouterError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
