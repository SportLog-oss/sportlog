"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  calculateConcept2Pace,
  formatConcept2Time,
  parseConcept2Time,
  type Concept2PaceResult,
} from "@/lib/concept2";

export function Concept2PaceCalculator() {
  const [distance, setDistance] = useState("");
  const [split, setSplit] = useState("");
  const [total, setTotal] = useState("");
  const [result, setResult] = useState<Concept2PaceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function calculate() {
    setError(null);
    try {
      setResult(
        calculateConcept2Pace({
          distanceMeters: parsePositiveNumber(distance),
          splitSecondsPer500: parseConcept2Time(split),
          totalSeconds: parseConcept2Time(total),
        })
      );
    } catch (calculationError) {
      setResult(null);
      setError(calculationError instanceof Error ? calculationError.message : "Berechnung fehlgeschlagen.");
    }
  }

  function reset() {
    setDistance("");
    setSplit("");
    setTotal("");
    setResult(null);
    setError(null);
  }

  return (
    <Card title="Concept2 Pace-Rechner" subtitle="Zwei Werte eingeben, den dritten Wert und die Leistung berechnen">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Distanz (m)" value={distance} onChange={setDistance} placeholder="z. B. 2000" />
        <Field label="500-m-Split" value={split} onChange={setSplit} placeholder="z. B. 1:50" />
        <Field label="Gesamtzeit" value={total} onChange={setTotal} placeholder="z. B. 7:20" />
      </div>
      {error && <p className="mt-3 text-sm text-negative">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={calculate}
          className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-black"
        >
          <Calculator size={15} /> Berechnen
        </button>
        <button type="button" onClick={reset} className="rounded-lg border border-border px-3 py-2 text-sm text-muted">
          Zurücksetzen
        </button>
      </div>
      {result && (
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface-raised p-4 sm:grid-cols-4">
          <Result label="Distanz" value={`${Math.round(result.distanceMeters).toLocaleString("de-DE")} m`} />
          <Result label="500-m-Split" value={formatConcept2Time(result.splitSecondsPer500)} />
          <Result label="Gesamtzeit" value={formatConcept2Time(result.totalSeconds)} />
          <Result label="Ø Leistung" value={`${Math.round(result.watts)} W`} />
        </div>
      )}
    </Card>
  );
}

function Field(props: { label: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-1 block text-xs text-muted">{props.label}</span>
      <input
        inputMode="decimal"
        value={props.value}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(event.target.value)}
        className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm"
      />
    </label>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function parsePositiveNumber(value: string): number | undefined {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
