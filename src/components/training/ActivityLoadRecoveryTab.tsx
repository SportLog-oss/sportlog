"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { TrendChart } from "@/components/charts/TrendChart";
import { assessLoadRecovery } from "@/lib/loadRecovery";
import type { DailyMetricRow } from "@/lib/types";

const METRIC_HELP = {
  ctl: "Langfristige Fitness: geglättete Trainingsbelastung der vergangenen Wochen.",
  atl: "Kurzfristige Belastung: stärker gewichtete Belastung der letzten Tage.",
  tsb: "Aktuelle Form: Differenz aus langfristiger Fitness und kurzfristiger Belastung. Kein medizinischer Erholungswert.",
};

export function ActivityLoadRecoveryTab({ date }: { date: string }) {
  const [rows, setRows] = useState<DailyMetricRow[] | null>(null);

  useEffect(() => {
    fetch("/api/health").then((response) => response.json()).then((data) => setRows(data.rows ?? [])).catch(() => setRows([]));
  }, []);

  if (rows === null) return <p className="text-sm text-muted text-center py-8">Lade Belastungsdaten …</p>;
  const index = rows.findIndex((row) => row.date === date);
  const row = index >= 0 ? rows[index] : null;
  if (!row) return <p className="text-sm text-muted text-center py-8">Keine Belastungs- oder Erholungsdaten für diesen Tag verfügbar.</p>;

  const assessment = assessLoadRecovery(rows, index);
  const windowRows = rows.slice(Math.max(0, index - 10), index + 11);
  const trendData = windowRows.map((item) => ({ date: item.date, ctl: item.ctl, atl: item.atl, tsb: item.tsb }));

  return <div className="space-y-6">
    <Card title="Einordnung dieser Einheit">
      <p className="font-medium">{assessment.headline}</p>
      {assessment.statements.length > 0 && <ul className="mt-3 space-y-1 text-sm text-muted">{assessment.statements.map((statement) => <li key={statement}>• {statement}</li>)}</ul>}
      <p className="text-xs text-muted mt-3">Die Bewertung beschreibt Trainingsbelastung und Formtrend, keine medizinische Erholung.</p>
    </Card>

    <Card title="Belastung & Form an diesem Tag">
      <div className="grid sm:grid-cols-3 gap-4">
        <Metric title="Langfristige Fitness" code="CTL" value={row.ctl} help={METRIC_HELP.ctl} />
        <Metric title="Kurzfristige Belastung" code="ATL" value={row.atl} help={METRIC_HELP.atl} />
        <Metric title="Aktuelle Form" code="TSB" value={row.tsb} help={METRIC_HELP.tsb} />
      </div>
    </Card>

    {trendData.length > 1 && <Card title="Entwicklung rund um diesen Tag" subtitle="Langfristige Fitness, kurzfristige Belastung und aktuelle Form">
      <TrendChart data={trendData} lines={[
        { key: "ctl", color: "var(--accent)", name: "Langfristige Fitness" },
        { key: "atl", color: "var(--warning)", name: "Kurzfristige Belastung" },
        { key: "tsb", color: "var(--positive)", name: "Aktuelle Form" },
      ]} referenceLine={0} />
    </Card>}
  </div>;
}

function Metric({ title, code, value, help }: { title: string; code: string; value: number | null; help: string }) {
  return <div className="rounded-lg bg-surface-raised p-3" title={help}>
    <div className="flex items-center gap-1.5"><span className="text-xs text-muted">{title}</span><span className="text-[10px] text-muted border border-border rounded px-1">{code}</span></div>
    <p className="text-lg font-semibold mt-1">{value?.toFixed(1) ?? "–"}</p>
    <p className="text-[11px] text-muted mt-1">{help}</p>
  </div>;
}
