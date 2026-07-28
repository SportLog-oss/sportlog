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
  z5: 'Z5 Maximal',
};

export function ActivityHrZones({ zones }: { zones: { z1: number; z2: number; z3: number; z4: number; z5: number } }) {
  const total = zones.z1 + zones.z2 + zones.z3 + zones.z4 + zones.z5;
  if (total === 0) return <Text style={{ color: Colors.muted, fontSize: 13 }}>Keine HF-Zonendaten für diese Einheit.</Text>;

  return (
    <View style={{ gap: 10 }}>
      {(['z1', 'z2', 'z3', 'z4', 'z5'] as const).map((key) => {
        const seconds = zones[key];
        const pct = (seconds / total) * 100;
        const minutes = Math.round(seconds / 60);
        return (
          <View key={key} style={styles.row}>
            <Text style={styles.label}>{ZONE_LABELS[key]}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct}%`, backgroundColor: ZONE_COLORS[key] }]} />
            </View>
            <Text style={styles.value}>
              {minutes}min ({pct.toFixed(0)}%)
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 12, color: Colors.muted, width: 84 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Colors.surfaceRaised, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  value: { fontSize: 12, color: Colors.foreground, width: 76, textAlign: 'right' },
});
