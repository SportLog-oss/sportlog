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
        "X-Title": "SportLog",
      },
    });
  }
  return client;
}

// Pinned models instead of the "openrouter/free" auto-router: the free router rotates across
// whatever models OpenRouter currently offers for free, which may or may not support vision or
// tool-calling reliably from one request to the next.
//
// This account has no purchased OpenRouter credits (confirmed via a live 402 "Insufficient
// credits" response from a paid model), so the pinned models MUST carry the ":free" suffix —
// paid models fail every request regardless of quality. Both models below were verified live
// against https://openrouter.ai/api/v1/models to confirm they (a) are free, (b) declare
// "tools" in supported_parameters, and (c) accept image input — then smoke-tested with a real
// completion call. Re-verify against that endpoint if either model is ever retired.
export const COACH_MODEL = "google/gemma-4-31b-it:free";
export const COACH_MODEL_FALLBACK = "nvidia/nemotron-nano-12b-v2-vl:free";

export const PHOTO_ANALYSIS_MODEL = "google/gemma-4-31b-it:free";
export const PHOTO_ANALYSIS_MODEL_FALLBACK = "nvidia/nemotron-nano-12b-v2-vl:free";

/**
 * Calls the primary model and transparently retries with the fallback model on server-side
 * errors, timeouts, or rate limits. Client errors (bad request, auth) are not retried since the
 * fallback model would fail the same way.
 */
export async function createChatCompletionWithFallback(
  client: OpenAI,
  params: Omit<OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming, "model">,
  models: { primary: string; fallback: string }
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  try {
    return await client.chat.completions.create({ ...params, model: models.primary });
  } catch (error) {
    const isClientError = error instanceof OpenAI.APIError && !!error.status && error.status < 500 && error.status !== 429;
    if (isClientError) throw error;
    return await client.chat.completions.create({ ...params, model: models.fallback });
  }
}

export function friendlyOpenRouterError(error: unknown): { message: string; status: number } {
  if (error instanceof OpenAI.APIError) {
    const status = error.status ?? 502;
    if (status === 401) {
      return { message: "Der OPENROUTER_API_KEY ist ungültig. Bitte in .env.local prüfen.", status: 401 };
    }
    if (status === 429) {
      return {
        message: "Das OpenRouter-Kontingent ist gerade ausgeschöpft. Bitte in ein paar Minuten erneut versuchen.",
        status: 429,
      };
    }
    return { message: `OpenRouter API-Fehler: ${error.message}`, status };
  }
  return { message: "Unerwarteter Fehler beim Abrufen der KI-Antwort.", status: 500 };
}
