"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

export interface TrendPoint {
  date: string;
  [key: string]: string | number | null;
}

export function TrendChart({
  data,
  lines,
  height = 220,
  referenceLine,
}: {
  data: TrendPoint[];
  lines: { key: string; color: string; name: string }[];
  height?: number;
  referenceLine?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          tickFormatter={(v: string) => v.slice(5)}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
        {referenceLine !== undefined && (
          <ReferenceLine y={referenceLine} stroke="var(--border)" strokeDasharray="4 4" />
        )}
        <Tooltip
          contentStyle={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--muted)" }}
        />
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.name}
            stroke={line.color}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
