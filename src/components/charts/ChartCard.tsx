import { Card } from "@/components/ui/Card";
import { ExplanationPanel } from "@/components/ui/ExplanationPanel";
import { TrendChart, type TrendPoint } from "@/components/charts/TrendChart";
import type { Explanation } from "@/lib/insights";

export function ChartCard({
  title,
  subtitle,
  data,
  lines,
  explanation,
  referenceLine,
}: {
  title: string;
  subtitle?: string;
  data: TrendPoint[];
  lines: { key: string; color: string; name: string }[];
  explanation: Explanation;
  referenceLine?: number;
}) {
  return (
    <Card title={title} subtitle={subtitle}>
      <TrendChart data={data} lines={lines} referenceLine={referenceLine} />
      <div className="mt-4">
        <ExplanationPanel explanation={explanation} />
      </div>
    </Card>
  );
}
