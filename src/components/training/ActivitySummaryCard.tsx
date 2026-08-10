"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Sparkles, Loader2 } from "lucide-react";

interface SummarySections {
  summary: string;
  load: string;
  recovery: string;
  suggestions: string;
}

export function ActivitySummaryCard({ activityId }: { activityId: number }) {
  const [sections, setSections] = useState<SummarySections | null>(null);
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
      setSections(data);
    } catch {
      setError("Verbindung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="KI-Zusammenfassung">
      {sections ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{sections.summary}</p>
          {(sections.load || sections.recovery || sections.suggestions) && (
            <div className="grid gap-3 sm:grid-cols-3">
              {sections.load && (
                <div>
                  <p className="text-xs font-semibold text-muted mb-1">Belastung</p>
                  <p className="text-sm leading-relaxed">{sections.load}</p>
                </div>
              )}
              {sections.recovery && (
                <div>
                  <p className="text-xs font-semibold text-muted mb-1">Erholung</p>
                  <p className="text-sm leading-relaxed">{sections.recovery}</p>
                </div>
              )}
              {sections.suggestions && (
                <div>
                  <p className="text-xs font-semibold text-muted mb-1">Verbesserungsvorschläge</p>
                  <p className="text-sm leading-relaxed">{sections.suggestions}</p>
                </div>
              )}
            </div>
          )}
        </div>
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
