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
  if (tokens.length === 0) return { tokenCount: 0, response: null };

  const messages = tokens.map((to) => ({ to, title, body, sound: "default" }));

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });
  const response = await res.json().catch(() => null);
  await pruneDeadTokens(tokens, response);
  return { tokenCount: tokens.length, response };
}

// Expo returns one ticket per message, in the same order as the request. A ticket with
// error "DeviceNotRegistered" means the app was uninstalled or the token is otherwise
// permanently invalid — remove it so it stops accumulating forever (there's no unregister
// endpoint, so this cron-triggered send is the only place tokens ever get cleaned up).
async function pruneDeadTokens(tokens: string[], response: unknown) {
  if (!redis) return;
  const tickets = (response as { data?: { status: string; details?: { error?: string } }[] } | null)?.data;
  if (!Array.isArray(tickets)) return;

  const dead = new Set<string>();
  tickets.forEach((ticket, i) => {
    if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
      dead.add(tokens[i]);
    }
  });
  if (dead.size === 0) return;

  const remaining = tokens.filter((t) => !dead.has(t));
  await redis.set(TOKENS_KEY, remaining);
}
