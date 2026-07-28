import { NextResponse } from "next/server";
import { getOpenRouterClient, COACH_MODEL, friendlyOpenRouterError } from "@/lib/openrouter";
import { getCompetitions, saveCompetitions } from "@/lib/data/store";
import { buildAthleteContext } from "@/lib/context";
import { stripMarkdown } from "@/lib/textFormat";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const competitions = await getCompetitions();
  const idx = competitions.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });

  const openrouter = getOpenRouterClient();
  if (!openrouter) {
    return NextResponse.json(
      { error: "Kein OPENROUTER_API_KEY konfiguriert." },
      { status: 503 }
    );
  }

  const comp = competitions[idx];
  const context = await buildAthleteContext();
  const others = competitions.filter((c) => c.id !== id);

  const prompt = `Analysiere folgenden Wettkampf eines Rudersportlers und erstelle eine kompakte Analyse auf Deutsch mit den Abschnitten "Was lief gut", "Wo wurde Zeit verloren / was lief schlechter", "Vergleich zu früheren Rennen" (falls Daten vorhanden) und "Trainingsschwerpunkte für die nächsten Wochen".

Schreibe in normalem Fließtext ohne jegliche Markdown-Formatierung: keine Sternchen (** oder *) für Fett/Kursiv, keine Überschriften mit #, keine Tabellen. Nutze die Abschnittsnamen einfach als Klartext-Zeilen.

Wettkampf:
Name: ${comp.name}
Datum: ${comp.date}
Ort: ${comp.location}
Bootsklasse: ${comp.boatClass}
Mannschaft: ${comp.crew}
Ergebnis: ${comp.result}
Platzierung: ${comp.placement ?? "unbekannt"}
Splits: ${comp.splits.map((s) => `${s.split}: ${s.time}`).join(", ") || "keine erfasst"}
Ø Herzfrequenz: ${comp.avgHeartRate ?? "unbekannt"}
Wetter: ${comp.weather || "unbekannt"}, Wind: ${comp.wind || "unbekannt"}
Notizen des Athleten: ${comp.notes || "keine"}

Frühere Wettkämpfe zum Vergleich: ${
    others.length > 0
      ? others.map((c) => `${c.date} ${c.name}: ${c.result}, Platz ${c.placement ?? "–"}`).join("; ")
      : "keine vorhanden"
  }

Athleten-Kontext:
${context}`;

  try {
    const response = await openrouter.chat.completions.create({
      model: COACH_MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const analysis = stripMarkdown(response.choices[0]?.message?.content ?? "");
    competitions[idx] = { ...comp, analysis };
    await saveCompetitions(competitions);

    return NextResponse.json(competitions[idx]);
  } catch (error) {
    const { message, status } = friendlyOpenRouterError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
