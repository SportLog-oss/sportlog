"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Waves, Mail, Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Anmeldung fehlgeschlagen");
        return;
      }
      router.replace("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 space-y-5">
        <div className="flex items-center gap-2 justify-center mb-2">
          <Waves className="text-accent" size={26} />
          <span className="text-xl font-semibold">SportLog</span>
        </div>
        <p className="text-sm text-muted text-center">Privater Zugang — bitte anmelden</p>

        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            autoFocus
            type="email"
            autoComplete="email"
            placeholder="E-Mail"
            className="w-full bg-surface-raised border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="relative">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Passwort"
            className="w-full bg-surface-raised border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-negative">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-accent text-black rounded-lg px-3 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          Anmelden
        </button>
      </form>
    </div>
  );
}
