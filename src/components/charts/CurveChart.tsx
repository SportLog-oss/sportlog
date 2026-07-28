"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatDurationLabel } from "@/lib/format";
import type { CurvePoint } from "@/lib/types";

export function CurveChart({ points, color, unit }: { points: CurvePoint[]; color: string; unit: string }) {
  const data = points.map((p) => ({ label: formatDurationLabel(p.durationSec), value: p.bestValue, paceDisplay: p.paceDisplay }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
        <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
        <Tooltip
          contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "var(--muted)" }}
          formatter={(value, _name, item) => [
            item.payload.paceDisplay ?? `${Number(value).toFixed(0)} ${unit}`,
            "Bestwert",
          ]}
        />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
