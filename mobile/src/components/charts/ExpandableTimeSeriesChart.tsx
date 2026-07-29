import { useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { X, Maximize2 } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import type { ActivitySeriesPoint } from '@/lib/types';

const screenWidth = Dimensions.get('window').width;

export type SeriesMetric = 'heartRate' | 'speedKmh' | 'altitudeM' | 'cadence' | 'power';

export const METRIC_META: Record<SeriesMetric, { label: string; unit: string; color: string; decimals: number }> = {
  heartRate: { label: 'Herzfrequenz', unit: 'bpm', color: Colors.negative, decimals: 0 },
  speedKmh: { label: 'Geschwindigkeit', unit: 'km/h', color: Colors.accent, decimals: 1 },
  altitudeM: { label: 'Höhe', unit: 'm', color: Colors.positive, decimals: 0 },
  cadence: { label: 'Kadenz/Zugzahl', unit: '/min', color: Colors.warning, decimals: 0 },
  power: { label: 'Leistung', unit: 'W', color: Colors.accent, decimals: 0 },
};

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function thinLabels(labels: string[], maxLabels: number): string[] {
  if (labels.length <= maxLabels) return labels;
  const step = Math.ceil(labels.length / maxLabels);
  return labels.map((l, i) => (i % step === 0 || i === labels.length - 1 ? l : ''));
}

function hexToRgb(hex: string): string {
  const parsed = hex.replace('#', '');
  const bigint = parseInt(parsed, 16);
  return `${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255}`;
}

function buildChartData(series: ActivitySeriesPoint[], metric: SeriesMetric, maxLabels: number) {
  const values = series.map((p) => p[metric]);
  const labels = series.map((p) => formatElapsed(p.t));
  // Chart-kit can't render gaps — fall back to 0 for missing samples rather than dropping points,
  // which would misrepresent elapsed time on the x-axis.
  const clean = values.map((v) => (v === null || Number.isNaN(v) ? 0 : v));
  return { labels: thinLabels(labels, maxLabels), values: clean };
}

export function ExpandableTimeSeriesChart({
  series,
  metrics,
  title,
}: {
  series: ActivitySeriesPoint[];
  metrics: SeriesMetric[];
  title?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [metric, setMetric] = useState<SeriesMetric>(metrics[0]);
  const meta = METRIC_META[metric];
  const rgb = hexToRgb(meta.color);

  const hasData = series.some((p) => p[metric] !== null);
  if (series.length === 0) return null;

  const compact = buildChartData(series, metric, 5);
  const full = buildChartData(series, metric, 12);
  const fullWidth = Math.max(screenWidth - 32, full.labels.length * 10);

  return (
    <View>
      <Pressable style={styles.card} onPress={() => setVisible(true)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{title ?? meta.label}</Text>
          <Maximize2 size={14} color={Colors.muted} />
        </View>
        {hasData ? (
          <LineChart
            data={{ labels: compact.labels, datasets: [{ data: compact.values.length > 0 ? compact.values : [0] }] }}
            width={screenWidth - 64}
            height={140}
            withInnerLines={false}
            withOuterLines={false}
            withDots={false}
            segments={3}
            yAxisSuffix={` ${meta.unit}`}
            formatYLabel={(v) => Number(v).toFixed(meta.decimals)}
            chartConfig={{
              backgroundColor: Colors.surface,
              backgroundGradientFrom: Colors.surface,
              backgroundGradientTo: Colors.surface,
              decimalPlaces: meta.decimals,
              color: (opacity = 1) => `rgba(${rgb}, ${opacity})`,
              labelColor: () => Colors.muted,
              propsForLabels: { fontSize: 9 },
              propsForBackgroundLines: { stroke: Colors.border },
            }}
            bezier
            style={{ borderRadius: 12, marginLeft: -16 }}
          />
        ) : (
          <Text style={styles.noData}>Keine Daten für {meta.label}.</Text>
        )}
      </Pressable>

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setVisible(false)} style={styles.closeBtn}>
              <X size={18} color={Colors.foreground} />
              <Text style={styles.closeText}>Schließen</Text>
            </Pressable>
            <Text style={styles.modalTitle}>{meta.label}</Text>
            <View style={{ width: 80 }} />
          </View>

          <ScrollView horizontal contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20 }}>
            {hasData ? (
              <LineChart
                data={{ labels: full.labels, datasets: [{ data: full.values.length > 0 ? full.values : [0] }] }}
                width={fullWidth}
                height={320}
                withInnerLines={false}
                yAxisSuffix={` ${meta.unit}`}
                formatYLabel={(v) => Number(v).toFixed(meta.decimals)}
                chartConfig={{
                  backgroundColor: Colors.background,
                  backgroundGradientFrom: Colors.background,
                  backgroundGradientTo: Colors.background,
                  decimalPlaces: meta.decimals,
                  color: (opacity = 1) => `rgba(${rgb}, ${opacity})`,
                  labelColor: () => Colors.muted,
                  propsForLabels: { fontSize: 10 },
                  propsForDots: { r: '2', fill: meta.color },
                  propsForBackgroundLines: { stroke: Colors.border },
                }}
                bezier
                style={{ borderRadius: 12 }}
              />
            ) : (
              <Text style={styles.noData}>Keine Daten für {meta.label}.</Text>
            )}
          </ScrollView>

          <View style={styles.pillRow}>
            {metrics.map((m) => (
              <Pressable
                key={m}
                onPress={() => setMetric(m)}
                style={[styles.pill, m === metric && styles.pillActive]}
              >
                <Text style={[styles.pillText, m === metric && styles.pillTextActive]}>{METRIC_META[m].label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: Colors.foreground },
  noData: { color: Colors.muted, fontSize: 12, paddingVertical: 20 },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 80 },
  closeText: { color: Colors.foreground, fontSize: 13 },
  modalTitle: { color: Colors.foreground, fontSize: 15, fontWeight: '700' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  pill: { borderWidth: 1, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  pillActive: { backgroundColor: Colors.accentSoft, borderColor: Colors.accent },
  pillText: { color: Colors.muted, fontSize: 12 },
  pillTextActive: { color: Colors.accent, fontWeight: '600' },
});
