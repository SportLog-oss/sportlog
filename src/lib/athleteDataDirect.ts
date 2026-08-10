// Direct HTTP client for deterministic server-side AthleteData synchronization.

const MCP_BASE_URL = "https://mcp.athletedata.health/mcp";

function getApiKey(): string {
  const key = process.env.ATHLETEDATA_API_KEY;
  if (!key) throw new Error("ATHLETEDATA_API_KEY not configured");
  return key;
}

export async function callAthleteDataTool<T = unknown>(
  name: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  const url = `${MCP_BASE_URL}?apiKey=${getApiKey()}`;
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name, arguments: args },
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`AthleteData MCP HTTP ${response.status}`);

      const raw = await response.text();
      const dataLine = raw.split("\n").find((line) => line.startsWith("data: "));
      if (!dataLine) throw new Error(`Unexpected AthleteData response: ${raw.slice(0, 200)}`);

      const envelope = JSON.parse(dataLine.slice("data: ".length));
      if (envelope.error) throw new Error(`AthleteData tool error (${name}): ${envelope.error.message}`);

      const text = envelope.result?.content?.[0]?.text;
      if (typeof text !== "string") throw new Error(`AthleteData tool ${name} returned no text payload`);
      return JSON.parse(text) as T;
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`AthleteData tool ${name} failed`);
}
