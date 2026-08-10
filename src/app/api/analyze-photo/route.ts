import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getOpenRouterClient,
  PHOTO_ANALYSIS_MODEL,
  PHOTO_ANALYSIS_MODEL_FALLBACK,
  createChatCompletionWithFallback,
  friendlyOpenRouterError,
} from "@/lib/openrouter";
import { getActivities, getActivityNotes, saveActivityNotes, getBenchmarks, saveBenchmarks } from "@/lib/data/store";
import { stripMarkdown, extractJson } from "@/lib/textFormat";

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

// Plausibility bounds for a rowing/ergo-style session — guards against the AI misreading a
// display and handing back a technically-well-formed but nonsensical number (e.g. reading "2000m"
// as a duration, or a corrupted watt value as distance) that would otherwise get written straight
// into activity_notes/benchmarks.
const MIN_PLAUSIBLE_DISTANCE_M = 50;
const MAX_PLAUSIBLE_DISTANCE_M = 50_000;
const MIN_PLAUSIBLE_DURATION_S = 10;
const MAX_PLAUSIBLE_DURATION_S = 6 * 60 * 60;

function parseAnalysisResult(raw: string): PhotoAnalysisResult | null {
  try {
    const parsed = JSON.parse(extractJson(raw));
    if (typeof parsed.analysisText !== "string") return null;

    let distanceMeters = typeof parsed.distanceMeters === "number" ? parsed.distanceMeters : null;
    if (distanceMeters !== null && (distanceMeters < MIN_PLAUSIBLE_DISTANCE_M || distanceMeters > MAX_PLAUSIBLE_DISTANCE_M)) {
      distanceMeters = null;
    }
    let durationSeconds = typeof parsed.durationSeconds === "number" ? parsed.durationSeconds : null;
    if (durationSeconds !== null && (durationSeconds < MIN_PLAUSIBLE_DURATION_S || durationSeconds > MAX_PLAUSIBLE_DURATION_S)) {
      durationSeconds = null;
    }

    return {
      readable: typeof parsed.readable === "boolean" ? parsed.readable : true,
      analysisText: parsed.analysisText,
      distanceMeters,
      durationSeconds,
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
  const { imageBase64, mimeType, previewOnly = false } = await req.json();
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
    // Deliberately NOT setting response_format: { type: "json_object" } here — live-tested and
    // confirmed reproducible: combining structured-output mode with image input makes
    // nvidia/nemotron-nano-12b-v2-vl:free (and, per its shared free-tier behavior, likely other
    // budget vision models too) hang for 45s+ before eventually still returning plain text, while
    // the exact same request without response_format or without the image each complete in under
    // a second. The prompt already demands JSON-only prose, and parseAnalysisResult/extractJson
    // above strips markdown fences or extracts the first {...} object, so we don't need the API
    // to enforce it — this was very likely the main cause of "Bildanalyse funktioniert nicht
    // zuverlässig", not the model choice itself.
    const response = await createChatCompletionWithFallback(
      openrouter,
      {
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

    // The Ergo-Test flow first lets the athlete verify the recognised values. Nothing is written
    // until the separate confirmation step creates the OCR workout and updates its benchmark.
    if (previewOnly) {
      return NextResponse.json({
        analysis,
        extracted,
        readable: parsed.readable,
        matchedActivity: null,
        matchAttempted: false,
        savedNote: false,
        noMatchReason: null,
        benchmarkUpdate: null,
      });
    }

    let matchedActivity: { activityId: number; activityName: string; date: string } | null = null;
    let benchmarkUpdate: { name: string; value: number; isNewBest: boolean } | null = null;
    // These three flags are what the UI uses to show "erkannt / gespeichert / zugeordnet" as three
    // distinct, always-visible facts instead of silently doing nothing when a step doesn't apply.
    let matchAttempted = false;
    let savedNote = false;
    let noMatchReason: string | null = null;

    if (!parsed.readable) {
      return NextResponse.json({
        analysis,
        extracted,
        matchedActivity,
        matchAttempted,
        savedNote,
        noMatchReason,
        benchmarkUpdate,
        readable: false,
      });
    }

    if (extracted.distanceMeters && extracted.durationSeconds) {
      const { distanceMeters, durationSeconds } = extracted;
      matchAttempted = true;

      // Try to attach the analysis as a note on a matching recent rowing activity. Matching is
      // scoped to Garmin-synced activities (source='garmin') — a workout logged via "Training
      // manuell erfassen" has no numeric Garmin activity id to attach a note to, so it can never
      // match here; noMatchReason below makes that outcome explicit instead of silent.
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
          savedNote = true;
          matchedActivity = {
            activityId: match.activityId,
            activityName: match.activityName,
            date: new Date(match.startTimeInSeconds * 1000).toISOString().slice(0, 10),
          };
        } else {
          noMatchReason = "Keine passende Rudereinheit in den letzten Trainings gefunden (Distanz/Zeit weichen zu stark ab, oder die Einheit wurde nicht über Garmin synchronisiert).";
        }
      } catch {
        // best-effort — analysis text is still returned even if matching fails
        noMatchReason = "Zuordnung zu einem Training fehlgeschlagen.";
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
                id: randomUUID(),
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

    return NextResponse.json({
      analysis,
      extracted,
      matchedActivity,
      matchAttempted,
      savedNote,
      noMatchReason,
      benchmarkUpdate,
      readable: true,
    });
  } catch (error) {
    const { message, status } = friendlyOpenRouterError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
