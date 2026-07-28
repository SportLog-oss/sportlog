"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Upload, Loader2, Sparkles, X } from "lucide-react";

export function PhotoAnalysis() {
  const [preview, setPreview] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setAnalysis(null);
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
        setAnalysis(data.analysis);
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
    setAnalysis(null);
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

          {!analysis && (
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

          {analysis && (
            <div className="rounded-lg border border-border bg-surface-raised p-3 text-sm whitespace-pre-wrap leading-relaxed">
              {analysis}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
