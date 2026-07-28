"use client";

import { Card } from "@/components/ui/Card";

interface ParsedLap {
  index: number;
  intensity: string;
  trigger: string;
  duration: string;
  distance: string;
  paceOrSpeed: string;
  hrAvg: number | null;
  hrMax: number | null;
  cadenceAvg: number | null;
  cadenceMax: number | null;
  powerW: number | null;
  ascentM: number | null;
  descentM: number | null;
}

export function LapsTable({ laps }: { laps: ParsedLap[] }) {
  if (laps.length === 0) return null;

  const hasCadence = laps.some((l) => l.cadenceAvg !== null);
  const hasPower = laps.some((l) => l.powerW !== null);
  const hasElevation = laps.some((l) => l.ascentM !== null);

  return (
    <Card title="Runden">
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="text-xs text-muted">
              <th className="text-left py-1.5 pr-3 font-normal">#</th>
              <th className="text-left py-1.5 pr-3 font-normal">Dauer</th>
              <th className="text-left py-1.5 pr-3 font-normal">Distanz</th>
              <th className="text-left py-1.5 pr-3 font-normal">Tempo</th>
              <th className="text-right py-1.5 pr-3 font-normal">HF Ø/Max</th>
              {hasCadence && <th className="text-right py-1.5 pr-3 font-normal">Kadenz Ø/Max</th>}
              {hasPower && <th className="text-right py-1.5 pr-3 font-normal">Leistung</th>}
              {hasElevation && <th className="text-right py-1.5 font-normal">Höhenmeter</th>}
            </tr>
          </thead>
          <tbody>
            {laps.map((lap) => (
              <tr key={lap.index} className="border-t border-border">
                <td className="py-1.5 pr-3">{lap.index}</td>
                <td className="py-1.5 pr-3">{lap.duration}</td>
                <td className="py-1.5 pr-3">{lap.distance}</td>
                <td className="py-1.5 pr-3">{lap.paceOrSpeed}</td>
                <td className="py-1.5 pr-3 text-right">
                  {lap.hrAvg != null ? `${lap.hrAvg}/${lap.hrMax}` : "–"}
                </td>
                {hasCadence && (
                  <td className="py-1.5 pr-3 text-right">
                    {lap.cadenceAvg != null ? `${lap.cadenceAvg}/${lap.cadenceMax}` : "–"}
                  </td>
                )}
                {hasPower && <td className="py-1.5 pr-3 text-right">{lap.powerW != null ? `${lap.powerW} W` : "–"}</td>}
                {hasElevation && (
                  <td className="py-1.5 text-right">
                    {lap.ascentM != null ? `+${lap.ascentM.toFixed(0)}/-${lap.descentM?.toFixed(0)} m` : "–"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
