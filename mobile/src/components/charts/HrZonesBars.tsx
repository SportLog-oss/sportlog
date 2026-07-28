import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';

const ZONE_COLORS: Record<string, string> = {
  z1: '#60a5fa',
  z2: '#34d399',
  z3: '#fbbf24',
  z4: '#fb923c',
  z5: '#f87171',
};

const ZONE_LABELS: Record<string, string> = {
  z1: 'Z1 Locker',
  z2: 'Z2 Grundlage',
  z3: 'Z3 Tempo',
  z4: 'Z4 Schwelle',
  z5: 'Z5 VO2max',
};

export function HrZonesBars({ zones }: { zones: Record<string, { hours: number; pct: number }> }) {
  return (
    <View style={{ gap: 10 }}>
      {Object.entries(zones).map(([key, val]) => (
        <View key={key} style={styles.row}>
          <Text style={styles.label}>{ZONE_LABELS[key] ?? key}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${val.pct}%`, backgroundColor: ZONE_COLORS[key] ?? Colors.accent }]} />
          </View>
          <Text style={styles.value}>{val.pct}%</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 12, color: Colors.muted, width: 90 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Colors.surfaceRaised, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  value: { fontSize: 12, color: Colors.foreground, width: 34, textAlign: 'right' },
});
