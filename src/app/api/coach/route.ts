import { NextRequest, NextResponse } from "next/server";
import { getOpenRouterClient, COACH_MODEL, friendlyOpenRouterError } from "@/lib/openrouter";
import { buildAthleteContext, COACH_SYSTEM_PROMPT } from "@/lib/context";
import { stripMarkdown } from "@/lib/textFormat";
import type { ChatMessage } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const messages: ChatMessage[] = body.messages ?? [];

  const openrouter = getOpenRouterClient();
  if (!openrouter) {
    return NextResponse.json(
      {
        error:
          "Kein OPENROUTER_API_KEY konfiguriert. Trage ihn in .env.local ein, damit der KI-Coach antworten kann.",
      },
      { status: 503 }
    );
  }

  const context = await buildAthleteContext();

  try {
    const response = await openrouter.chat.completions.create({
      model: COACH_MODEL,
      max_tokens: 4096,
      messages: [
        { role: "system", content: `${COACH_SYSTEM_PROMPT}\n\n=== Athleten-Datenschnappschuss ===\n${context}` },
        ...messages.map((m) => ({ role: m.role, content: m.content }) as const),
      ],
    });

    const reply = stripMarkdown(response.choices[0]?.message?.content ?? "");
    return NextResponse.json({ reply });
  } catch (error) {
    const { message, status } = friendlyOpenRouterError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
