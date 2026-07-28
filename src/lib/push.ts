import { Redis } from "@upstash/redis";

const redis =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
    : null;

const TOKENS_KEY = "push:tokens";

export async function registerPushToken(token: string) {
  if (!redis) return;
  const tokens = ((await redis.get<string[]>(TOKENS_KEY)) ?? []).filter((t) => t !== token);
  tokens.push(token);
  await redis.set(TOKENS_KEY, tokens);
}

export async function getPushTokens(): Promise<string[]> {
  if (!redis) return [];
  return (await redis.get<string[]>(TOKENS_KEY)) ?? [];
}

export async function sendPushToAll(title: string, body: string) {
  const tokens = await getPushTokens();
  if (tokens.length === 0) return;

  const messages = tokens.map((to) => ({ to, title, body, sound: "default" }));

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });
}
