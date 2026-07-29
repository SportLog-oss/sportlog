"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Sparkles, Loader2 } from "lucide-react";

export function ActivitySummaryCard({ activityId }: { activityId: number }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/training/${activityId}/summary`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Zusammenfassung fehlgeschlagen.");
        return;
      }
      setSummary(data.summary);
    } catch {
      setError("Verbindung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="KI-Zusammenfassung">
      {summary ? (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Lass dir eine kurze Einschätzung dieser Einheit generieren: was lief gut, Auffälligkeiten, Belastung & Erholung, Verbesserungsvorschläge.
          </p>
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 bg-accent text-black rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? "Generiere…" : "Zusammenfassung generieren"}
          </button>
          {error && <p className="text-sm text-negative">{error}</p>}
        </div>
      )}
    </Card>
  );
}
