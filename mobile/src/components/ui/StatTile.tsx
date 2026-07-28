import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';
import type { Sentiment } from '@/lib/types';

const TONE_COLORS: Record<Sentiment | 'neutral', string> = {
  positive: Colors.positive,
  negative: Colors.negative,
  neutral: Colors.foreground,
};

export function StatTile({
  label,
  value,
  unit,
  tone = 'neutral',
  hint,
}: {
  label: string;
  value: string | number;
  unit?: string;
  tone?: Sentiment | 'neutral';
  hint?: string;
}) {
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: TONE_COLORS[tone] }]}>{value}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 14,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
  },
  unit: {
    fontSize: 12,
    color: Colors.muted,
  },
  hint: {
    fontSize: 11,
    color: Colors.muted,
  },
});
