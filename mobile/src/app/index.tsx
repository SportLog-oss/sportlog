import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Lightbulb, Trophy } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { WarningBanner } from '@/components/ui/WarningBanner';
import { MetricGauge } from '@/components/ui/MetricGauge';
import { api } from '@/lib/api';
import { useForceRefresh } from '@/lib/useForceRefresh';
import { formatDate, recoveryLabel, sleepPerformanceLabel, strainLabel } from '@/lib/format';
import type { DashboardResponse } from '@/lib/types';

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.dashboard();
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const { refreshing, onRefresh } = useForceRefresh(load);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Keine Daten'}</Text>
        <Text style={styles.hintText}>
          Prüfe, ob der Server erreichbar ist (gleiches WLAN, richtige IP in app.json → extra.apiBaseUrl).
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
    >
      <View style={styles.metricsRow}>
        <Card style={styles.metricCard}>
          <Text style={styles.metricTitle}>Erholung</Text>
          <MetricGauge
            value={data.stats.recoveryPct ?? 0}
            label={data.stats.recoveryPct != null ? recoveryLabel(data.stats.recoveryPct) : undefined}
            size={104}
          />
        </Card>
        <Card style={styles.metricCard}>
          <Text style={styles.metricTitle}>Belastung</Text>
          <MetricGauge value={data.stats.strain} max={21} decimals={1} label={strainLabel(data.stats.strain)} size={104} />
        </Card>
        <Card style={styles.metricCard}>
          <Text style={styles.metricTitle}>Schlaf-Perf.</Text>
          <MetricGauge
            value={data.stats.sleepPerformance ?? 0}
            label={data.stats.sleepPerformance != null ? sleepPerformanceLabel(data.stats.sleepPerformance) : undefined}
            size={104}
          />
        </Card>
      </View>

      <View style={styles.recommendationBox}>
        <Lightbulb size={18} color={Colors.accent} style={{ marginTop: 1 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.recommendationTitle}>Heutige Empfehlung</Text>
          <Text style={styles.recommendationText}>{data.recommendation}</Text>
        </View>
      </View>

      {data.warnings.length > 0 && (
        <View style={{ gap: 12 }}>
          <Text style={styles.sectionLabel}>Warnungen</Text>
          {data.warnings.map((w, i) => (
            <WarningBanner key={i} warning={w} />
          ))}
        </View>
      )}

      <Card title="Ziele & Wettkämpfe">
        <View style={{ gap: 14 }}>
          <View>
            <Text style={styles.subLabel}>Aktuelle Ziele</Text>
            {data.goals.length === 0 && <Text style={styles.emptyText}>Keine Ziele hinterlegt.</Text>}
            {data.goals.map((g) => (
              <View key={g.id} style={styles.listRow}>
                <Text style={styles.listTitle} numberOfLines={1}>{g.title}</Text>
                <Text style={styles.listMeta}>{formatDate(g.targetDate)}</Text>
              </View>
            ))}
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <Trophy size={12} color={Colors.muted} />
              <Text style={styles.subLabel}>Wettkämpfe</Text>
            </View>
            {data.competitions.length === 0 && <Text style={styles.emptyText}>Noch keine Wettkämpfe erfasst.</Text>}
            {data.competitions.map((c) => (
              <View key={c.id} style={styles.listRow}>
                <Text style={styles.listTitle} numberOfLines={1}>{c.name}</Text>
                <Text style={styles.listMeta}>{formatDate(c.date)}</Text>
              </View>
            ))}
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, padding: 24, gap: 8 },
  errorText: { color: Colors.negative, fontSize: 14, textAlign: 'center' },
  hintText: { color: Colors.muted, fontSize: 12, textAlign: 'center' },
  metricsRow: { flexDirection: 'row', gap: 8 },
  metricCard: { flex: 1, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12 },
  metricTitle: { fontSize: 11, fontWeight: '600', color: Colors.muted, marginBottom: 4, textAlign: 'center' },
  recommendationBox: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Colors.accent}55`,
    backgroundColor: Colors.accentSoft,
    padding: 14,
  },
  recommendationTitle: { fontSize: 13, fontWeight: '600', color: Colors.foreground },
  recommendationText: { fontSize: 13, color: Colors.foreground, opacity: 0.9, marginTop: 2, lineHeight: 18 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  subLabel: { fontSize: 11, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  emptyText: { fontSize: 13, color: Colors.muted },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  listTitle: { fontSize: 13, color: Colors.foreground, flex: 1, marginRight: 8 },
  listMeta: { fontSize: 12, color: Colors.muted },
});
