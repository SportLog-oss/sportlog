"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { CurveChart } from "@/components/charts/CurveChart";
import type { CurvePoint } from "@/lib/types";

type Curves = { power: { points: CurvePoint[] }; pace: { points: CurvePoint[] } };

export function PerformanceCurvesSection() {
  const [curves, setCurves] = useState<Curves | null>(null);

  useEffect(() => {
    fetch("/api/training")
      .then((response) => response.json())
      .then((data) => setCurves(data.curves ?? null))
      .catch(() => setCurves(null));
  }, []);

  if (!curves) return null;

  return (
    <section>
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Deine Entwicklung</p>
        <h2 className="mt-1 text-xl font-semibold">Leistungskurven</h2>
        <p className="mt-1 text-sm text-muted">Deine besten belastbaren Werte der letzten 90 Tage.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Radleistung" subtitle="Beste Leistung nach Belastungsdauer">
          <CurveChart points={curves.power.points} color="var(--accent)" unit="W" />
        </Card>
        <Card title="Lauftempo" subtitle="Beste Pace nach Belastungsdauer">
          <CurveChart points={curves.pace.points} color="var(--positive)" unit="s/km" />
        </Card>
      </div>
    </section>
  );
}
