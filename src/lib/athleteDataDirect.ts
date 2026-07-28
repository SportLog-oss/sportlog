// Direct HTTP client for the AthleteData MCP server, used ONLY by deterministic
// server code (the Vercel Cron sync route) — never by an AI agent. This is plain
// JSON-RPC over HTTP, no Claude/MCP-connector permission model involved.

const MCP_BASE_URL = "https://mcp.athletedata.health/mcp";

function getApiKey(): string {
  const key = process.env.ATHLETEDATA_API_KEY;
  if (!key) throw new Error("ATHLETEDATA_API_KEY not configured");
  return key;
}

export async function callAthleteDataTool<T = unknown>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const url = `${MCP_BASE_URL}?apiKey=${getApiKey()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
  });

  if (!res.ok) throw new Error(`AthleteData MCP HTTP ${res.status}`);

  const raw = await res.text();
  // Response is SSE-style: "event: message\ndata: {...}\n\n" — extract the JSON payload.
  const dataLine = raw.split("\n").find((l) => l.startsWith("data: "));
  if (!dataLine) throw new Error(`Unexpected AthleteData response: ${raw.slice(0, 200)}`);

  const envelope = JSON.parse(dataLine.slice("data: ".length));
  if (envelope.error) throw new Error(`AthleteData tool error (${name}): ${envelope.error.message}`);

  const text = envelope.result?.content?.[0]?.text;
  if (typeof text !== "string") throw new Error(`AthleteData tool ${name} returned no text payload`);

  return JSON.parse(text) as T;
}
