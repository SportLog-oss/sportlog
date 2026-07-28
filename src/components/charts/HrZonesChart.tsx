"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

const ZONE_COLORS: Record<string, string> = {
  z1: "#60a5fa",
  z2: "#34d399",
  z3: "#fbbf24",
  z4: "#fb923c",
  z5: "#f87171",
};

const ZONE_LABELS: Record<string, string> = {
  z1: "Z1 Locker",
  z2: "Z2 Grundlage",
  z3: "Z3 Tempo",
  z4: "Z4 Schwelle",
  z5: "Z5 VO2max",
};

export function HrZonesChart({ zones }: { zones: Record<string, { hours: number; pct: number }> }) {
  const data = Object.entries(zones).map(([key, val]) => ({
    zone: ZONE_LABELS[key] ?? key,
    key,
    pct: val.pct,
    hours: val.hours,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
        <YAxis type="category" dataKey="zone" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
        <Tooltip
          contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "var(--muted)" }}
          formatter={(value, _name, item) => [`${value}% (${item.payload.hours}h)`, "Anteil"]}
        />
        <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
          {data.map((d) => (
            <Cell key={d.key} fill={ZONE_COLORS[d.key] ?? "var(--accent)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
