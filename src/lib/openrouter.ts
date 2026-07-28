import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenRouterClient(): OpenAI | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  if (!client) {
    client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://sportlog.local",
        "X-Title": "Sportlog",
      },
    });
  }
  return client;
}

// Auto-routes across OpenRouter's free-tier models, so it keeps working as the underlying free lineup rotates.
export const COACH_MODEL = "openrouter/free";

export function friendlyOpenRouterError(error: unknown): { message: string; status: number } {
  if (error instanceof OpenAI.APIError) {
    const status = error.status ?? 502;
    if (status === 401) {
      return { message: "Der OPENROUTER_API_KEY ist ungültig. Bitte in .env.local prüfen.", status: 401 };
    }
    if (status === 429) {
      return {
        message: "Das kostenlose OpenRouter-Kontingent ist gerade ausgeschöpft. Bitte in ein paar Minuten erneut versuchen.",
        status: 429,
      };
    }
    return { message: `OpenRouter API-Fehler: ${error.message}`, status };
  }
  return { message: "Unerwarteter Fehler beim Abrufen der KI-Antwort.", status: 500 };
}
