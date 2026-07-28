import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ExplanationPanel } from '@/components/ui/ExplanationPanel';
import { MetricGauge } from '@/components/ui/MetricGauge';
import { TrendChart } from '@/components/charts/TrendChart';
import { api } from '@/lib/api';
import { useForceRefresh } from '@/lib/useForceRefresh';
import { readinessVerdictLabel } from '@/lib/format';
import { SleepDetailSection } from '@/components/health/SleepDetailSection';
import type { HealthResponse } from '@/lib/types';

export default function HealthScreen() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setData(await api.health());
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

  if (loading || !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  const labels = data.rows.map((r) => r.date.slice(5));
  const lastWithRecovery = [...data.rows].reverse().find((r) => r.recoveryScore !== null);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
    >
      <Card title="Trainingsbereitschaft" subtitle="Kombiniert HFV, Ruhepuls, Schlaf und Belastung">
        <View style={styles.readinessTop}>
          <MetricGauge
            value={lastWithRecovery?.readinessScoreV2 ?? 0}
            label={readinessVerdictLabel(lastWithRecovery?.readinessVerdict)}
          />
          {data.readinessFactors.length > 0 && (
            <View style={styles.factorGrid}>
              {data.readinessFactors.map((f) => (
                <View key={f.label} style={styles.factorBox}>
                  <Text style={styles.factorLabel}>{f.label}</Text>
                  <Text
                    style={[
                      styles.factorValue,
                      f.tone === 'positive' && { color: Colors.positive },
                      f.tone === 'negative' && { color: Colors.negative },
                    ]}
                  >
                    {f.value}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <TrendChart labels={labels} data={data.rows.map((r) => r.readinessScoreV2)} color={Colors.accent} />
        <ExplanationPanel explanation={data.explanations.readiness} />
      </Card>

      <SleepDetailSection />

      <Card title="Schlaf-Score (14 Tage)" subtitle={`Ø ${data.trends.sleep.avg_duration_hours} h Schlafdauer`}>
        <TrendChart labels={labels} data={data.rows.map((r) => r.sleepScore)} color={Colors.accent} />
        <ExplanationPanel explanation={data.explanations.sleep} />
      </Card>

      <Card title="HFV (14 Tage)" subtitle="Herzfrequenzvariabilität">
        <TrendChart labels={labels} data={data.rows.map((r) => r.hrv)} color={Colors.accent} />
        <ExplanationPanel explanation={data.explanations.hrv} />
      </Card>

      <Card title="Ruhepuls (14 Tage)">
        <TrendChart labels={labels} data={data.rows.map((r) => r.restingHr)} color={Colors.warning} />
        <ExplanationPanel explanation={data.explanations.rhr} />
      </Card>

      <Card title="Form / TSB (14 Tage)" subtitle="Training Stress Balance">
        <TrendChart labels={labels} data={data.rows.map((r) => r.tsb)} color={Colors.positive} />
        <ExplanationPanel explanation={data.explanations.load} />
      </Card>

      <Card title="Überlastungsrisiko-Index (14 Tage)" subtitle="Frühwarnsignal, keine Diagnose">
        <TrendChart
          labels={data.injuryRisk.trend_14d.map((d) => d.date.slice(5))}
          data={data.injuryRisk.trend_14d.map((d) => d.index)}
          color={Colors.negative}
        />
        <ExplanationPanel explanation={data.explanations.injuryRisk} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  readinessTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14, flexWrap: 'wrap' },
  factorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1, minWidth: 160 },
  factorBox: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  factorLabel: { fontSize: 11, color: Colors.muted },
  factorValue: { fontSize: 13, fontWeight: '600', color: Colors.foreground, marginTop: 1 },
});
