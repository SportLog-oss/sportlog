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
// paid models fail every request regardless of quality. Both models were verified live against
// https://openrouter.ai/api/v1/models to confirm they (a) are free, (b) declare "tools" in
// supported_parameters, and (c) accept image input.
//
// Ordering note (2026-07): live-tested both models directly against OpenRouter. `nemotron-nano`
// returns clean results immediately; `gemma-4-31b` is currently rate-limited on its shared free
// pool ("temporarily rate-limited upstream", HTTP 429 on essentially every call) — using it as
// primary means EVERY request pays a failed-call-then-fallback round trip. Put the currently
// reliable model first; re-check both against the /models endpoint (and with a real request) if
// this ever needs revisiting, since free-tier availability shifts over time.
export const COACH_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free";
export const COACH_MODEL_FALLBACK = "google/gemma-4-31b-it:free";

// The former Nemotron Nano 12B endpoint currently accepts image requests but returns no usable
// completion. These two models were re-checked with image input on 2026-08-03; both produced a
// valid response, so the Ergo flow no longer depends on the broken endpoint.
export const PHOTO_ANALYSIS_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
export const PHOTO_ANALYSIS_MODEL_FALLBACK = "google/gemma-4-26b-a4b-it:free";

/**
 * Calls the primary model and transparently retries with the fallback model on server-side
 * errors, timeouts, rate limits, or a 400 (which on OpenRouter often means "model temporarily
 * unavailable/misconfigured upstream," not a malformed request — the fallback model gets a real
 * chance to succeed). Auth/permission errors (401/403) are not retried since the fallback model
 * would fail identically against the same account.
 */
export async function createChatCompletionWithFallback(
  client: OpenAI,
  params: Omit<OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming, "model">,
  models: { primary: string; fallback: string }
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  try {
    return await client.chat.completions.create({ ...params, model: models.primary });
  } catch (error) {
    const isAuthError = error instanceof OpenAI.APIError && (error.status === 401 || error.status === 403);
    if (isAuthError) throw error;
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
