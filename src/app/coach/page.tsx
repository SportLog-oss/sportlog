"use client";

import { useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { Send, Loader2, MessageCircleHeart } from "lucide-react";

const SUGGESTIONS = [
  "Bin ich heute bereit für ein intensives Training?",
  "Warum ist meine HRV zuletzt gesunken?",
  "Vergleiche diese Woche mit letzter Woche.",
  "Gibt es Anzeichen für Übertraining?",
];

export default function CoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Fehler beim Abrufen der Antwort.");
        return;
      }
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Verbindung zum KI-Coach fehlgeschlagen.");
    } finally {
      setLoading(false);
      requestAnimationFrame(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight));
    }
  }

  return (
    <div className="flex-1 flex flex-col h-screen">
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

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-2xl rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === "user" ? "bg-accent text-black" : "bg-surface border border-border"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border rounded-2xl px-4 py-3 flex items-center gap-2 text-sm text-muted">
              <Loader2 size={14} className="animate-spin" /> Der Coach denkt nach…
            </div>
          </div>
        )}

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
  );
}
