"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Link2, Trophy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { BenchmarksSection } from "@/components/training/BenchmarksSection";
import { PersonalBestsSection } from "@/components/erfolg/PersonalBestsSection";
import { formatClockDuration, formatDate } from "@/lib/format";

type SourceType = "workout_garmin" | "workout_concept2" | "benchmark_entry";

type PerformanceBest = {
  attemptId: string;
  kind: string;
  label: string;
  value: number;
  unit: string;
  occurredAt: string;
  sources: SourceType[];
  exactSourceAvailable: boolean;
};

const SOURCE_LABELS: Record<SourceType, string> = {
  workout_garmin: "Garmin",
  workout_concept2: "Concept2",
  benchmark_entry: "bestätigter Testwert",
};

function formatValue(best: PerformanceBest) {
  if (best.unit === "s") return formatClockDuration(best.value);
  if (best.unit === "m") return `${Math.round(best.value).toLocaleString("de-DE")} m`;
  return `${best.value.toLocaleString("de-DE")} ${best.unit}`;
}

function sourceSummary(sources: SourceType[]) {
  const labels = sources.map((source) => SOURCE_LABELS[source]);
  return labels.length ? labels.join(" + ") : "Quelle nicht verfügbar";
}

export function UnifiedPerformanceBestsSection() {
  const [bests, setBests] = useState<PerformanceBest[] | null>(null);
  const [legacyFallback, setLegacyFallback] = useState(false);

  useEffect(() => {
    fetch("/api/performance-bests")
      .then(async (response) => {
        if (!response.ok) throw new Error("performance identity unavailable");
        return response.json();
      })
      .then((data) => setBests(data.bests ?? []))
      .catch(() => setLegacyFallback(true));
  }, []);

  if (legacyFallback) {
    return (
      <div className="space-y-5">
        <PersonalBestsSection />
        <BenchmarksSection />
      </div>
    );
  }

  if (bests === null) return null;

  return (
    <div className="space-y-5">
      <Card
        title="Deine Ruder-Bestleistungen"
        subtitle="Garmin und bestätigte Ergo-Tests werden als eine Leistung zusammengeführt – ohne Doppelzählung."
      >
        {bests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
            <Trophy className="mx-auto text-muted" size={22} />
            <p className="mt-2 text-sm font-medium">Noch keine gemeinsame Bestleistung</p>
            <p className="mt-1 text-xs text-muted">Erfasse einen Ergo-Test oder synchronisiere eine passende Garmin-Einheit.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {bests.map((best) => (
              <div key={best.attemptId} className="rounded-xl border border-border bg-surface-raised p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">{best.label}</p>
                    <p className="mt-1 text-2xl font-semibold">{formatValue(best)}</p>
                  </div>
                  {best.exactSourceAvailable ? (
                    <BadgeCheck size={20} className="shrink-0 text-positive" aria-label="Bestätigter Testwert" />
                  ) : (
                    <Trophy size={19} className="shrink-0 text-accent" />
                  )}
                </div>
                <p className="mt-3 text-xs text-muted">{formatDate(best.occurredAt)}</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                  <Link2 size={13} className="shrink-0" />
                  <span>{sourceSummary(best.sources)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <BenchmarksSection />
    </div>
  );
}
