"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatSession, PersistedChatMessage } from "@/lib/types";
import { Send, Loader2, MessageCircleHeart, Plus, Search, Pencil, Trash2, Check, X } from "lucide-react";

const SUGGESTIONS = [
  "Bin ich heute bereit für ein intensives Training?",
  "Warum ist meine HFV zuletzt gesunken?",
  "Vergleiche diese Woche mit letzter Woche.",
  "Gibt es Anzeichen für Übertraining?",
];

type DisplayMessage = PersistedChatMessage | { id: string; chatId: string; role: "assistant"; content: string; createdAt: string; streaming: true };

export default function CoachPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [query, setQuery] = useState("");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const localIdCounter = useRef(0);

  function genLocalId(prefix: string): string {
    localIdCounter.current += 1;
    return `${prefix}-${localIdCounter.current}`;
  }

  async function loadSessions(q?: string) {
    const res = await fetch(`/api/coach/sessions${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    if (res.ok) setSessions(await res.json());
  }

  useEffect(() => {
    fetch("/api/coach/sessions")
      .then((r) => (r.ok ? r.json() : []))
      .then(setSessions);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/coach/sessions${query ? `?q=${encodeURIComponent(query)}` : ""}`)
        .then((r) => (r.ok ? r.json() : []))
        .then(setSessions);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  async function selectChat(id: string) {
    setActiveChatId(id);
    setError(null);
    const res = await fetch(`/api/coach/sessions/${id}/messages`);
    setMessages(res.ok ? await res.json() : []);
  }

  async function createChat(): Promise<string> {
    const res = await fetch("/api/coach/sessions", { method: "POST" });
    const session: ChatSession = await res.json();
    setSessions((s) => [session, ...s]);
    setActiveChatId(session.id);
    setMessages([]);
    return session.id;
  }

  async function renameChat(id: string) {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    await fetch("/api/coach/sessions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title: renameValue.trim() }),
    });
    setSessions((s) => s.map((sess) => (sess.id === id ? { ...sess, title: renameValue.trim() } : sess)));
    setRenamingId(null);
  }

  async function deleteChat(id: string) {
    if (!confirm("Diesen Chat wirklich löschen?")) return;
    await fetch("/api/coach/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSessions((s) => s.filter((sess) => sess.id !== id));
    if (activeChatId === id) {
      setActiveChatId(null);
      setMessages([]);
    }
  }

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setError(null);
    setInput("");

    let chatId = activeChatId;
    if (!chatId) chatId = await createChat();

    const userMsg: PersistedChatMessage = {
      id: genLocalId("local"),
      chatId,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    const placeholder: DisplayMessage = {
      id: genLocalId("streaming"),
      chatId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      streaming: true,
    };
    setMessages((m) => [...m, userMsg, placeholder]);
    setLoading(true);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message: text }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Fehler beim Abrufen der Antwort.");
        setMessages((m) => m.filter((msg) => msg.id !== placeholder.id));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          if (!frame.startsWith("data: ")) continue;
          const json = JSON.parse(frame.slice(6));
          if (json.snapshot != null) {
            const snapshot = json.snapshot;
            setMessages((m) => m.map((msg) => (msg.id === placeholder.id ? { ...msg, content: snapshot } : msg)));
          } else if (json.done) {
            const finalMsg: PersistedChatMessage = json.message;
            setMessages((m) => m.map((msg) => (msg.id === placeholder.id ? finalMsg : msg)));
            loadSessions(query);
          } else if (json.error) {
            setError(json.error);
            setMessages((m) => m.filter((msg) => msg.id !== placeholder.id));
          }
        }
      }
    } catch {
      setError("Verbindung zum KI-Coach fehlgeschlagen.");
      setMessages((m) => m.filter((msg) => msg.id !== placeholder.id));
    } finally {
      setLoading(false);
      requestAnimationFrame(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight));
    }
  }

  return (
    <div className="flex-1 flex h-screen overflow-hidden">
      <aside className="w-64 shrink-0 border-r border-border flex flex-col">
        <div className="p-3 space-y-2">
          <button
            onClick={createChat}
            className="w-full flex items-center justify-center gap-2 bg-accent text-black rounded-lg py-2 text-sm font-medium"
          >
            <Plus size={16} /> Neuer Chat
          </button>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chats durchsuchen…"
              className="w-full bg-surface-raised border border-border rounded-lg pl-8 pr-2 py-1.5 text-sm focus:outline-none focus:border-accent/50"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`group flex items-center gap-1 rounded-lg px-2 py-2 text-sm cursor-pointer ${
                s.id === activeChatId ? "bg-accent-soft text-accent" : "hover:bg-surface-raised text-muted"
              }`}
            >
              {renamingId === s.id ? (
                <div className="flex items-center gap-1 flex-1">
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && renameChat(s.id)}
                    className="flex-1 bg-surface border border-accent/50 rounded px-1.5 py-0.5 text-sm focus:outline-none"
                  />
                  <button onClick={() => renameChat(s.id)}>
                    <Check size={14} />
                  </button>
                  <button onClick={() => setRenamingId(null)}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="flex-1 truncate text-left"
                    onClick={() => selectChat(s.id)}
                  >
                    {s.title}
                  </button>
                  <button
                    onClick={() => {
                      setRenamingId(s.id);
                      setRenameValue(s.title);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-foreground"
                  >
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => deleteChat(s.id)} className="opacity-0 group-hover:opacity-100 hover:text-negative">
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          ))}
          {sessions.length === 0 && <p className="text-xs text-muted px-2 py-4">Noch keine Chats.</p>}
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="border-b border-border px-8 py-5">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <MessageCircleHeart size={20} className="text-accent" /> KI-Coach
          </h1>
          <p className="text-sm text-muted mt-0.5">Frag alles zu deinen Trainings- und Gesundheitsdaten</p>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted">Ein paar Ideen zum Einstieg:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-sm bg-surface border border-border rounded-full px-3 py-1.5 hover:border-accent/50 hover:text-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-2xl rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === "user" ? "bg-accent text-black" : "bg-surface border border-border"
                }`}
              >
                {m.content}
                {"streaming" in m && m.content === "" && (
                  <Loader2 size={14} className="animate-spin inline-block text-muted" />
                )}
              </div>
            </div>
          ))}

          {error && (
            <div className="text-sm text-negative bg-negative/10 border border-negative/30 rounded-lg px-4 py-3">
              {error}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-border p-4 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Frag deinen KI-Coach…"
            className="flex-1 bg-surface-raised border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent/50"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-accent text-black rounded-xl px-4 py-3 disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
