"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { TrendChart } from "@/components/charts/TrendChart";
import type { MentalHealthCheckin } from "@/lib/types";

/** Reiner Rückblick auf bisherige mentale Check-ins (Konzept 005) — das Erfassen-Formular lebt im
 * globalen Befinden-erfassen-Panel, siehe MentalHealthQuickLog. */
export function MentalHealthHistorySection() {
  const [checkins, setCheckins] = useState<MentalHealthCheckin[] | null>(null);

  useEffect(() => {
    fetch("/api/mental-health").then((r) => r.json()).then(setCheckins);
  }, []);

  if (checkins === null) return null;

  const trendData = [...checkins]
    .reverse()
    .slice(-30)
    .map((c) => ({ date: c.timestamp.slice(0, 10), valence: +c.valence.toFixed(2) }));

  return (
    <div className="space-y-6">
      <Card title="Mentale Check-ins · Verlauf" subtitle={`${checkins.length} ${checkins.length === 1 ? "Check-in" : "Check-ins"}`}>
        {checkins.length === 0 ? (
          <p className="text-sm text-muted">Noch keine Check-ins erfasst.</p>
        ) : (
          <div className="space-y-2">
            {checkins.slice(0, 20).map((c) => (
              <div key={c.id} className="flex items-center gap-3 text-sm">
                <span className="text-xs text-muted w-32 shrink-0">{new Date(c.timestamp).toLocaleString("de-DE")}</span>
                <span className="flex-1">
                  {c.type === "mood"
                    ? `Täglicher Check-in — Motivation ${c.motivation ?? "–"}, Stress ${c.stress ?? "–"}, Energie ${c.energy ?? "–"}, Schlaf ${c.sleepQuality ?? "–"}`
                    : c.emotionTags.join(", ") || "–"}
                </span>
                <span className="text-xs text-muted">{c.valence.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {trendData.length > 1 && (
        <Card title="Verlauf" subtitle="Valenz der letzten Check-ins (-1 bis 1)">
          <TrendChart data={trendData} lines={[{ key: "valence", color: "var(--accent)", name: "Valenz" }]} referenceLine={0} />
        </Card>
      )}
    </div>
  );
}
