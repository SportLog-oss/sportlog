import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ExplanationPanel } from '@/components/ui/ExplanationPanel';
import { TrendChart } from '@/components/charts/TrendChart';
import { api } from '@/lib/api';
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

  if (loading || !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  const labels = data.rows.map((r) => r.date.slice(5));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.accent} />}
    >
      <Card title="Schlaf-Score (14 Tage)" subtitle={`Ø ${data.trends.sleep.avg_duration_hours} h Schlafdauer`}>
        <TrendChart labels={labels} data={data.rows.map((r) => r.sleepScore)} color={Colors.accent} />
        <ExplanationPanel explanation={data.explanations.sleep} />
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
});
