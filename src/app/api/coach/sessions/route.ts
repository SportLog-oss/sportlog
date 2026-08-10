import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getChatSessions, saveChatSessions, deleteChatMessages } from "@/lib/data/store";
import type { ChatSession } from "@/lib/types";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.toLowerCase().trim();
  const sessions = await getChatSessions();
  const filtered = q ? sessions.filter((s) => s.title.toLowerCase().includes(q)) : sessions;
  return NextResponse.json(filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
}

export async function POST() {
  const sessions = await getChatSessions();
  const now = new Date().toISOString();
  const newSession: ChatSession = {
    id: randomUUID(),
    title: "Neuer Chat",
    createdAt: now,
    updatedAt: now,
  };
  sessions.push(newSession);
  await saveChatSessions(sessions);
  return NextResponse.json(newSession, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const sessions = await getChatSessions();
  const idx = sessions.findIndex((s) => s.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
  sessions[idx] = { ...sessions[idx], title: body.title ?? sessions[idx].title, updatedAt: new Date().toISOString() };
  await saveChatSessions(sessions);
  return NextResponse.json(sessions[idx]);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const sessions = (await getChatSessions()).filter((s) => s.id !== id);
  await saveChatSessions(sessions);
  await deleteChatMessages(id);
  return NextResponse.json({ ok: true });
}
