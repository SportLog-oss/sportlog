import { NextRequest } from "next/server";
import type OpenAI from "openai";
import { getOpenRouterClient, COACH_MODEL, COACH_MODEL_FALLBACK } from "@/lib/openrouter";
import { buildAthleteContext, COACH_SYSTEM_PROMPT } from "@/lib/context";
import { stripMarkdown } from "@/lib/textFormat";
import { COACH_TOOLS, executeCoachTool } from "@/lib/coachTools";
import {
  getChatMessages,
  saveChatMessages,
  getChatSessions,
  saveChatSessions,
} from "@/lib/data/store";
import type { PersistedChatMessage } from "@/lib/types";

function generateTitle(message: string): string {
  const trimmed = message.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 48) return trimmed;
  return `${trimmed.slice(0, 45)}…`;
}

// Loosely typed on purpose: precisely typing the RunnableTools<FunctionsArgs> generic tuple
// for a dynamically-built tool list adds no safety here — each tool's args are validated at
// runtime inside executeCoachTool's switch statement.
function toRunnableTools() {
  return COACH_TOOLS.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters as Record<string, unknown>,
      parse: (input: string) => (input ? JSON.parse(input) : {}),
      function: (args: Record<string, unknown>) => executeCoachTool(tool.function.name, args),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any[];
}

const encoder = new TextEncoder();

export async function POST(req: NextRequest) {
  const body = await req.json();
  const chatId: string | undefined = body.chatId;
  const messageText: string | undefined = body.message;

  if (!chatId || !messageText || !messageText.trim()) {
    return new Response(JSON.stringify({ error: "chatId und message sind erforderlich." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const openrouter = getOpenRouterClient();
  if (!openrouter) {
    return new Response(
      JSON.stringify({ error: "Kein OPENROUTER_API_KEY konfiguriert. Trage ihn in .env.local ein." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const sessions = await getChatSessions();
  const sessionIdx = sessions.findIndex((s) => s.id === chatId);
  if (sessionIdx === -1) {
    return new Response(JSON.stringify({ error: "Chat nicht gefunden." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const history = await getChatMessages(chatId);
  const now = new Date().toISOString();
  const userMessage: PersistedChatMessage = {
    id: `msg-${Date.now()}-u`,
    chatId,
    role: "user",
    content: messageText,
    createdAt: now,
  };

  // Persist the user's message immediately so it's never lost even if the AI call fails.
  const historyWithUser = [...history, userMessage];
  await saveChatMessages(chatId, historyWithUser);

  const isFirstMessage = history.length === 0;
  if (isFirstMessage || sessions[sessionIdx].title === "Neuer Chat") {
    sessions[sessionIdx] = { ...sessions[sessionIdx], title: generateTitle(messageText), updatedAt: now };
  } else {
    sessions[sessionIdx] = { ...sessions[sessionIdx], updatedAt: now };
  }
  await saveChatSessions(sessions);

  const context = await buildAthleteContext();
  const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: `${COACH_SYSTEM_PROMPT}\n\n=== Athleten-Datenschnappschuss ===\n${context}` },
    ...historyWithUser.map((m) => ({ role: m.role, content: m.content }) as const),
  ];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let sentAnyContent = false;
      let finalText = "";

      function send(frame: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`));
      }

      async function runWithModel(model: string) {
        const runner = openrouter!.chat.completions.runTools({
          model,
          max_tokens: 4096,
          stream: true,
          messages: openaiMessages,
          tools: toRunnableTools(),
        });
        // Send the running snapshot (stripped fresh each time) rather than raw deltas — a
        // delta-by-delta strip would break on a "**" that arrives split across two chunks,
        // showing raw asterisks mid-stream. Re-stripping the whole snapshot each chunk is a
        // few extra regex passes on short chat text, not a real cost.
        runner.on("content", (_delta: string, snapshot: string) => {
          sentAnyContent = true;
          send({ snapshot: stripMarkdown(snapshot) });
        });
        finalText = (await runner.finalContent()) ?? "";
      }

      try {
        try {
          await runWithModel(COACH_MODEL);
        } catch (err) {
          if (sentAnyContent) throw err; // already streamed partial content — can't cleanly retry
          await runWithModel(COACH_MODEL_FALLBACK);
        }

        const cleaned = stripMarkdown(finalText);
        const assistantMessage: PersistedChatMessage = {
          id: `msg-${Date.now()}-a`,
          chatId,
          role: "assistant",
          content: cleaned,
          createdAt: new Date().toISOString(),
        };
        await saveChatMessages(chatId, [...historyWithUser, assistantMessage]);

        send({ done: true, message: assistantMessage });
      } catch (error) {
        send({ error: error instanceof Error ? error.message : "Unerwarteter Fehler beim Abrufen der KI-Antwort." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
