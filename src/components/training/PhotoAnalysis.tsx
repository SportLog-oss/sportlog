"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Upload, Loader2, Sparkles, X, CheckCircle2, Trophy } from "lucide-react";

type AnalyzeResult = {
  analysis: string;
  matchedActivity: { activityId: number; activityName: string; date: string } | null;
  benchmarkUpdate: { name: string; value: number; isNewBest: boolean } | null;
};

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PhotoAnalysis() {
  const [preview, setPreview] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setResult(null);
    setError(null);
    setMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreview(result);
      setBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }

  async function analyze() {
    if (!base64) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analyse fehlgeschlagen");
      } else {
        setResult(data);
      }
    } catch {
      setError("Verbindung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPreview(null);
    setBase64(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Card title="Ergo-Foto analysieren" subtitle="Foto vom Ergometer-Display oder Trainingsprotokoll hochladen">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {!preview && (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-sm text-muted hover:border-accent/50 hover:text-accent transition-colors"
        >
          <Upload size={22} />
          Foto auswählen
        </button>
      )}

      {preview && (
        <div className="space-y-3">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Ergo-Foto" className="max-h-64 rounded-lg mx-auto object-contain" />
            <button onClick={reset} className="absolute top-2 right-2 bg-surface/80 rounded-full p-1 text-muted hover:text-negative">
              <X size={16} />
            </button>
          </div>

          {!result && (
            <button
              onClick={analyze}
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full bg-accent text-black rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {loading ? "Analysiere…" : "Analysieren"}
            </button>
          )}

          {error && <p className="text-sm text-negative">{error}</p>}

          {result && (
            <div className="space-y-2">
              {result.matchedActivity && (
                <div className="flex items-center gap-2 rounded-lg border border-positive/30 bg-positive/10 px-3 py-2 text-sm text-positive">
                  <CheckCircle2 size={15} className="shrink-0" />
                  Als Notiz zu &quot;{result.matchedActivity.activityName}&quot; ({result.matchedActivity.date}) hinzugefügt
                </div>
              )}
              {result.benchmarkUpdate?.isNewBest && (
                <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
                  <Trophy size={15} className="shrink-0" />
                  Neuer Bestwert: {result.benchmarkUpdate.name} – {formatClock(result.benchmarkUpdate.value)}
                </div>
              )}
              <div className="rounded-lg border border-border bg-surface-raised p-3 text-sm whitespace-pre-wrap leading-relaxed">
                {result.analysis}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
