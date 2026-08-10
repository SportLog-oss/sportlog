"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Camera, CheckCircle2, ImagePlus, Loader2, PencilLine, Sparkles, Trophy, X } from "lucide-react";

type AnalyzeResult = {
  analysis: string;
  readable: boolean;
  extracted: { distanceMeters: number | null; durationSeconds: number | null };
};

type Benchmark = { id: string; name: string; entries: { value: number }[] };

const TEST_NAMES: Record<number, string> = {
  350: "350m Sprint",
  1000: "1000m Dorfregatten",
  1500: "1500m B-Junior Distance",
  2000: "2000m normale Distance",
  6000: "6000m Langstrecke",
};

function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toFixed(1).padStart(4, "0")}`;
}

function parseClock(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parts = normalized.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 1) return parts[0] > 0 ? parts[0] : null;
  if (parts.length === 2 && parts[1] >= 0 && parts[1] < 60) return parts[0] * 60 + parts[1];
  return null;
}

export function PhotoAnalysis() {
  const [preview, setPreview] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manual, setManual] = useState(false);
  const [saved, setSaved] = useState<{ best: boolean; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setResult(null);
    setSaved(null);
    setError(null);
    setMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setBase64(dataUrl.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }

  async function analyze() {
    if (!base64) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/analyze-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType, previewOnly: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Analyse fehlgeschlagen");
      setResult(data);
      if (data.extracted.distanceMeters) setDistance(String(Math.round(data.extracted.distanceMeters)));
      if (data.extracted.durationSeconds) setDuration(formatClock(data.extracted.durationSeconds));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Verbindung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    const distanceMeters = Number(distance);
    const durationSeconds = parseClock(duration);
    if (!Number.isFinite(distanceMeters) || distanceMeters <= 0 || !durationSeconds) {
      setError("Bitte prüfe Distanz und Gesamtzeit.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const testName = TEST_NAMES[Math.round(distanceMeters)] ?? `${Math.round(distanceMeters)}m Ergo-Test`;
      const workoutResponse = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutType: "INDOOR_ROWING",
          source: "concept2_ocr",
          startedAt: new Date(`${date}T12:00:00`).toISOString(),
          title: testName,
          distanceMeters,
          durationSeconds,
          summaryText: result?.analysis ?? "Manuell erfasster Ruderergometer-Test",
        }),
      });
      if (!workoutResponse.ok) throw new Error("Der Ergo-Test konnte nicht gespeichert werden.");

      const benchmarksResponse = await fetch("/api/benchmarks");
      const benchmarks = (await benchmarksResponse.json()) as Benchmark[];
      const existing = benchmarks.find((benchmark) => benchmark.name === testName);
      const previousBest = existing?.entries.length ? Math.min(...existing.entries.map((entry) => entry.value)) : null;
      const isBest = previousBest === null || durationSeconds < previousBest;
      if (isBest) {
        const response = existing
          ? await fetch(`/api/benchmarks/${existing.id}/entries`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ date, value: durationSeconds, notes: "Aus Ergo-Test" }),
            })
          : await fetch("/api/benchmarks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: testName, kind: "time", unit: "s", lowerIsBetter: true, firstDate: date, firstValue: durationSeconds, firstNotes: "Aus Ergo-Test" }),
            });
        if (!response.ok) throw new Error("Der Test wurde gespeichert, aber die Bestzeit konnte nicht aktualisiert werden.");
      }
      setSaved({ best: isBest, name: testName });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setPreview(null);
    setBase64(null);
    setResult(null);
    setDistance("");
    setDuration("");
    setSaved(null);
    setError(null);
    setManual(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Card className="border-accent/30 bg-[linear-gradient(135deg,rgba(37,216,207,0.08),rgba(16,22,29,0.94)_55%)]">
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) handleFile(file);
      }} />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"><Camera size={22} /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Concept2 & Ruderergometer</p>
            <h2 className="mt-1 text-xl font-semibold">Ergo-Test erfassen</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">Display fotografieren, erkannte Werte prüfen und als Training speichern. Persönliche Bestzeiten aktualisiert SportLog automatisch.</p>
          </div>
        </div>
        {!preview && !manual && <div className="flex flex-wrap gap-2">
          <button onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black"><ImagePlus size={17} /> Foto aufnehmen</button>
          <button onClick={() => setManual(true)} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-muted hover:text-foreground"><PencilLine size={16} /> Manuell eingeben</button>
        </div>}
      </div>

      {(preview || manual) && <div className="mt-5 grid gap-5 border-t border-border pt-5 lg:grid-cols-[minmax(15rem,0.75fr)_minmax(0,1.25fr)]">
        <div className="relative flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border bg-background/30 p-3">
          {preview ? <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Ergometer-Display" className="max-h-56 rounded-lg object-contain" />
            <button onClick={reset} className="absolute right-2 top-2 rounded-full bg-surface p-1.5 text-muted hover:text-negative"><X size={16} /></button>
          </> : <div className="text-center text-sm text-muted"><PencilLine className="mx-auto mb-2" />Werte ohne Foto erfassen</div>}
        </div>
        <div className="space-y-4">
          {preview && !result && <button onClick={analyze} disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50">{loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}{loading ? "Display wird gelesen …" : "Foto analysieren"}</button>}
          {(result || manual) && !saved && <>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs text-muted">Distanz (m)<input value={distance} onChange={(event) => setDistance(event.target.value)} inputMode="numeric" className="mt-1 w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-base font-semibold text-foreground" /></label>
              <label className="text-xs text-muted">Gesamtzeit<input value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="z. B. 7:20.5" className="mt-1 w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-base font-semibold text-foreground" /></label>
              <label className="text-xs text-muted">Datum<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-base font-semibold text-foreground" /></label>
            </div>
            {result?.analysis && <p className="rounded-lg border border-border bg-background/30 p-3 text-sm leading-relaxed text-muted">{result.analysis}</p>}
            <div className="flex flex-wrap gap-2"><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50">{saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}{saving ? "Wird gespeichert …" : "Werte bestätigen & speichern"}</button><button onClick={reset} className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted">Abbrechen</button></div>
          </>}
          {saved && <div className="rounded-xl border border-positive/35 bg-positive/10 p-4 text-positive"><div className="flex items-center gap-2 font-semibold">{saved.best ? <Trophy size={18} /> : <CheckCircle2 size={18} />}{saved.best ? `Neue persönliche Bestzeit: ${saved.name}` : `${saved.name} gespeichert`}</div><p className="mt-1 text-sm">Der Test ist jetzt als Training in SportLog hinterlegt.</p><button onClick={reset} className="mt-3 text-sm font-semibold underline">Weiteren Test erfassen</button></div>}
          {error && <p className="text-sm text-negative">{error}</p>}
        </div>
      </div>}
    </Card>
  );
}
