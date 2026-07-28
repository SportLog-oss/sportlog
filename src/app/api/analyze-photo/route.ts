import { NextRequest, NextResponse } from "next/server";
import { getOpenRouterClient, COACH_MODEL, friendlyOpenRouterError } from "@/lib/openrouter";

const ANALYSIS_PROMPT = `Du bist ein Rudersport-Coach und analysierst ein Foto eines Ergometer-Displays (Concept2 o.ä.) oder eines handschriftlichen/digitalen Trainingsprotokolls mit Ergo-Zeiten oder Intervallen.

Extrahiere so genau wie möglich:
- Gesamtdistanz und/oder Gesamtzeit
- Splits/Intervalle (Distanz oder Zeit pro Abschnitt, Pace, Schlagzahl (spm), Herzfrequenz falls sichtbar)
- Watt falls sichtbar

Danach kommentiere kurz auf Deutsch:
- Wie gleichmäßig/konsistent waren die Splits?
- Gab es auffällige Einbrüche oder Steigerungen?
- Eine kurze Einschätzung der Leistung, wenn erkennbar (ohne Übertreibung, nur basierend auf dem Sichtbaren)

Falls das Bild unleserlich ist oder keine Ergo-Daten zeigt, sage das ehrlich statt Werte zu erfinden. Antworte in normalem Fließtext, keine Markdown-Tabellen.`;

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

    const analysis = response.choices[0]?.message?.content ?? "";
    return NextResponse.json({ analysis });
  } catch (error) {
    const { message, status } = friendlyOpenRouterError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
