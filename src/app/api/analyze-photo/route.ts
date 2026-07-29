import { NextRequest, NextResponse } from "next/server";
import {
  getOpenRouterClient,
  PHOTO_ANALYSIS_MODEL,
  PHOTO_ANALYSIS_MODEL_FALLBACK,
  createChatCompletionWithFallback,
  friendlyOpenRouterError,
} from "@/lib/openrouter";
import { getActivities, getActivityNotes, saveActivityNotes, getBenchmarks, saveBenchmarks } from "@/lib/data/store";
import { stripMarkdown } from "@/lib/textFormat";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // ~8MB base64 payload guard

const ANALYSIS_PROMPT = `Du bist ein Coach für Leistungssportler und analysierst ein Foto eines Ergometer-Displays (Concept2 o.ä.), eines GPS-Uhr-Displays oder eines handschriftlichen/digitalen Trainingsprotokolls mit Zeiten, Distanzen oder Intervallen.

Extrahiere so genau wie möglich:
- Gesamtdistanz und/oder Gesamtzeit
- Splits/Intervalle (Distanz oder Zeit pro Abschnitt, Pace, Schlagzahl (spm), Herzfrequenz falls sichtbar)
- Watt falls sichtbar

Danach kommentiere kurz auf Deutsch:
- Wie gleichmäßig/konsistent waren die Splits?
- Gab es auffällige Einbrüche oder Steigerungen?
- Eine kurze Einschätzung der Leistung, wenn erkennbar (ohne Übertreibung, nur basierend auf dem Sichtbaren)

Antworte AUSSCHLIESSLICH mit einem einzigen JSON-Objekt (kein Markdown, kein Fließtext davor oder danach) in genau dieser Form:
{
  "readable": <true wenn das Bild auswertbare Trainingsdaten zeigt, sonst false>,
  "analysisText": "<dein Kommentar in normalem Fließtext ohne Markdown-Formatierung; falls readable=false, erkläre hier kurz und ehrlich warum (z.B. unscharf, kein Ergo-Display erkennbar) statt Werte zu erfinden>",
  "distanceMeters": <Zahl oder null, nur wenn eine klar erkennbare GESAMTdistanz sichtbar ist>,
  "durationSeconds": <Zahl oder null, nur wenn eine klar erkennbare GESAMTzeit sichtbar ist>
}`;

interface PhotoAnalysisResult {
  readable: boolean;
  analysisText: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
}

function parseAnalysisResult(raw: string): PhotoAnalysisResult | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.analysisText !== "string") return null;
    return {
      readable: typeof parsed.readable === "boolean" ? parsed.readable : true,
      analysisText: parsed.analysisText,
      distanceMeters: typeof parsed.distanceMeters === "number" ? parsed.distanceMeters : null,
      durationSeconds: typeof parsed.durationSeconds === "number" ? parsed.durationSeconds : null,
    };
  } catch {
    return null;
  }
}

const BENCHMARK_PRESETS: { name: string; distanceMeters: number }[] = [
  { name: "350m Sprint", distanceMeters: 350 },
  { name: "1000m Dorfregatten", distanceMeters: 1000 },
  { name: "1500m B-Junior Distance", distanceMeters: 1500 },
  { name: "2000m normale Distance", distanceMeters: 2000 },
  { name: "6000m Langstrecke", distanceMeters: 6000 },
];

const ROWING_TYPES = ["ROWING_V2", "INDOOR_ROWING"];

export async function POST(req: NextRequest) {
  const { imageBase64, mimeType } = await req.json();
  if (!imageBase64) return NextResponse.json({ error: "imageBase64 required" }, { status: 400 });
  if (imageBase64.length > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Foto ist zu groß (max. ~6MB). Bitte ein kleineres Bild wählen." }, { status: 413 });
  }

  const openrouter = getOpenRouterClient();
  if (!openrouter) {
    return NextResponse.json(
      { error: "Kein OPENROUTER_API_KEY konfiguriert. Trage ihn in .env.local ein." },
      { status: 503 }
    );
  }

  try {
    const response = await createChatCompletionWithFallback(
      openrouter,
      {
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: ANALYSIS_PROMPT },
              { type: "image_url", image_url: { url: `data:${mimeType ?? "image/jpeg"};base64,${imageBase64}` } },
            ],
          },
        ],
      },
      { primary: PHOTO_ANALYSIS_MODEL, fallback: PHOTO_ANALYSIS_MODEL_FALLBACK }
    );

    const raw = response.choices[0]?.message?.content ?? "";
    const parsed = parseAnalysisResult(raw);

    if (!parsed) {
      return NextResponse.json(
        { error: "Die KI-Antwort konnte nicht ausgewertet werden. Bitte erneut versuchen." },
        { status: 502 }
      );
    }

    const extracted = { distanceMeters: parsed.distanceMeters, durationSeconds: parsed.durationSeconds };
    const analysis = stripMarkdown(parsed.analysisText);

    let matchedActivity: { activityId: number; activityName: string; date: string } | null = null;
    let benchmarkUpdate: { name: string; value: number; isNewBest: boolean } | null = null;

    if (!parsed.readable) {
      return NextResponse.json({ analysis, extracted, matchedActivity, benchmarkUpdate, readable: false });
    }

    if (extracted.distanceMeters && extracted.durationSeconds) {
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

    return NextResponse.json({ analysis, extracted, matchedActivity, benchmarkUpdate, readable: true });
  } catch (error) {
    const { message, status } = friendlyOpenRouterError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
