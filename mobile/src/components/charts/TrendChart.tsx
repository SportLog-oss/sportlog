import { useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Colors } from '@/constants/theme';

const screenWidth = Dimensions.get('window').width;

function hexToRgb(hex: string): string {
  const parsed = hex.replace('#', '');
  const bigint = parseInt(parsed, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}

// react-native-chart-kit renders every entry in `labels` — with 14 daily
// points that overlaps into an unreadable smear. Thin to ~5 evenly spaced
// labels by blanking out the rest; the data itself is untouched.
function thinLabels(labels: string[], maxLabels = 5): string[] {
  if (labels.length <= maxLabels) return labels;
  const step = Math.ceil(labels.length / maxLabels);
  return labels.map((l, i) => (i % step === 0 || i === labels.length - 1 ? l : ''));
}

export function TrendChart({
  labels,
  data,
  color = Colors.accent,
  suffix = '',
  decimalPlaces = 0,
}: {
  labels: string[];
  data: (number | null)[];
  color?: string;
  suffix?: string;
  decimalPlaces?: number;
}) {
  const [selected, setSelected] = useState<{ label: string; value: number } | null>(null);
  const cleanData = data.map((d) => (d === null || Number.isNaN(d) ? 0 : d));
  const rgb = hexToRgb(color);
  const displayLabels = thinLabels(labels);

  return (
    <View>
      <View style={styles.readout}>
        <Text style={styles.readoutText}>
          {selected ? `${selected.label}: ${selected.value.toFixed(decimalPlaces)}${suffix}` : 'Tippe auf einen Punkt für den Wert'}
        </Text>
      </View>
      <LineChart
        data={{
          labels: displayLabels,
          datasets: [{ data: cleanData.length > 0 ? cleanData : [0] }],
        }}
        width={screenWidth - 64}
        height={200}
        yAxisSuffix={suffix}
        segments={4}
        withInnerLines={false}
        withOuterLines={false}
        formatYLabel={(v) => Number(v).toFixed(decimalPlaces)}
        onDataPointClick={({ value, index }) => setSelected({ label: labels[index], value })}
        chartConfig={{
          backgroundColor: Colors.surface,
          backgroundGradientFrom: Colors.surface,
          backgroundGradientTo: Colors.surface,
          decimalPlaces,
          color: (opacity = 1) => `rgba(${rgb}, ${opacity})`,
          labelColor: () => Colors.muted,
          propsForLabels: { fontSize: 10 },
          propsForDots: { r: '3', fill: color },
          propsForBackgroundLines: { stroke: Colors.border },
        }}
        bezier
        style={{ borderRadius: 12, marginLeft: -16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  readout: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceRaised,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  readoutText: {
    fontSize: 12,
    color: Colors.foreground,
  },
});
