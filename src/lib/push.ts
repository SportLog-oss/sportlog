import { getSupabaseForRequest } from "@/lib/data/supabaseClient";

export async function registerPushToken(token: string) {
  const supabase = await getSupabaseForRequest();
  const { error } = await supabase.from("push_tokens").upsert({ token }, { onConflict: "token" });
  if (error) throw error;
}

export async function getPushTokens(): Promise<string[]> {
  const supabase = await getSupabaseForRequest();
  const { data, error } = await supabase.from("push_tokens").select("token");
  if (error) throw error;
  return (data ?? []).map((row) => row.token as string);
}

export async function sendPushToAll(title: string, body: string, data?: Record<string, string>) {
  await processOutstandingReceipts().catch(() => undefined);
  const tokens = await getPushTokens();
  if (tokens.length === 0) return { tokenCount: 0, response: null };

  const messages = tokens.map((to) => ({ to, title, body, sound: "default", data }));

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });
  const response = await res.json().catch(() => null);
  await pruneDeadTokens(tokens, response);
  await rememberReceiptTickets(tokens, response);
  return { tokenCount: tokens.length, response };
}

// Expo returns one ticket per message, in the same order as the request. A ticket with
// error "DeviceNotRegistered" means the app was uninstalled or the token is otherwise
// permanently invalid — remove it so it stops accumulating forever (there's no unregister
// endpoint, so this cron-triggered send is the only place tokens ever get cleaned up).
async function pruneDeadTokens(tokens: string[], response: unknown) {
  const tickets = (response as { data?: { status: string; details?: { error?: string } }[] } | null)?.data;
  if (!Array.isArray(tickets)) return;

  const dead: string[] = [];
  tickets.forEach((ticket, i) => {
    if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
      dead.push(tokens[i]);
    }
  });
  if (dead.length === 0) return;

  const supabase = await getSupabaseForRequest();
  const { error } = await supabase.from("push_tokens").delete().in("token", dead);
  if (error) throw error;
}

async function rememberReceiptTickets(tokens: string[], response: unknown) {
  const tickets = (response as { data?: { status: string; id?: string }[] } | null)?.data;
  if (!Array.isArray(tickets)) return;
  const rows = tickets.flatMap((ticket, index) =>
    ticket.status === "ok" && ticket.id ? [{ ticket_id: ticket.id, token: tokens[index] }] : []
  );
  if (rows.length === 0) return;
  const supabase = await getSupabaseForRequest();
  const { error } = await supabase.from("expo_push_receipt_tickets").upsert(rows, { onConflict: "ticket_id" });
  if (error) throw error;
}

async function processOutstandingReceipts() {
  const supabase = await getSupabaseForRequest();
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: rows, error } = await supabase
    .from("expo_push_receipt_tickets")
    .select("ticket_id,token")
    .lt("created_at", cutoff)
    .limit(1000);
  if (error || !rows?.length) return;

  const ids = rows.map((row) => row.ticket_id as string);
  const response = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) return;
  const payload = (await response.json()) as {
    data?: Record<string, { status: string; details?: { error?: string } }>;
  };
  const deadTokens = rows
    .filter((row) => payload.data?.[row.ticket_id as string]?.details?.error === "DeviceNotRegistered")
    .map((row) => row.token as string);
  if (deadTokens.length > 0) {
    const { error: deleteTokenError } = await supabase.from("push_tokens").delete().in("token", deadTokens);
    if (deleteTokenError) throw deleteTokenError;
  }
  const checkedIds = ids.filter((id) => payload.data?.[id]);
  if (checkedIds.length > 0) {
    const { error: deleteReceiptError } = await supabase
      .from("expo_push_receipt_tickets")
      .delete()
      .in("ticket_id", checkedIds);
    if (deleteReceiptError) throw deleteReceiptError;
  }
}
