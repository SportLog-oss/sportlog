import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/theme';

interface ParsedLap {
  index: number;
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

  const colWidths = { idx: 28, dur: 62, dist: 56, pace: 68, hr: 60, cad: 72, power: 56, elev: 90 };

  return (
    <Card title="Runden">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.row}>
            <Text style={[styles.headerCell, { width: colWidths.idx }]}>#</Text>
            <Text style={[styles.headerCell, { width: colWidths.dur }]}>Dauer</Text>
            <Text style={[styles.headerCell, { width: colWidths.dist }]}>Distanz</Text>
            <Text style={[styles.headerCell, { width: colWidths.pace }]}>Tempo</Text>
            <Text style={[styles.headerCell, { width: colWidths.hr }]}>HF Ø/Max</Text>
            {hasCadence && <Text style={[styles.headerCell, { width: colWidths.cad }]}>Kadenz</Text>}
            {hasPower && <Text style={[styles.headerCell, { width: colWidths.power }]}>Leistung</Text>}
            {hasElevation && <Text style={[styles.headerCell, { width: colWidths.elev }]}>Höhenmeter</Text>}
          </View>
          {laps.map((lap) => (
            <View key={lap.index} style={styles.row}>
              <Text style={[styles.cell, { width: colWidths.idx }]}>{lap.index}</Text>
              <Text style={[styles.cell, { width: colWidths.dur }]}>{lap.duration}</Text>
              <Text style={[styles.cell, { width: colWidths.dist }]}>{lap.distance}</Text>
              <Text style={[styles.cell, { width: colWidths.pace }]}>{lap.paceOrSpeed}</Text>
              <Text style={[styles.cell, { width: colWidths.hr }]}>{lap.hrAvg != null ? `${lap.hrAvg}/${lap.hrMax}` : '–'}</Text>
              {hasCadence && (
                <Text style={[styles.cell, { width: colWidths.cad }]}>
                  {lap.cadenceAvg != null ? `${lap.cadenceAvg}/${lap.cadenceMax}` : '–'}
                </Text>
              )}
              {hasPower && <Text style={[styles.cell, { width: colWidths.power }]}>{lap.powerW != null ? `${lap.powerW} W` : '–'}</Text>}
              {hasElevation && (
                <Text style={[styles.cell, { width: colWidths.elev }]}>
                  {lap.ascentM != null ? `+${lap.ascentM.toFixed(0)}/-${lap.descentM?.toFixed(0)} m` : '–'}
                </Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border, paddingVertical: 6 },
  headerCell: { fontSize: 10, color: Colors.muted },
  cell: { fontSize: 12, color: Colors.foreground },
});
