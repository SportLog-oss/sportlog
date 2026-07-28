import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Lightbulb } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { WarningBanner } from '@/components/ui/WarningBanner';
import { ExplanationPanel } from '@/components/ui/ExplanationPanel';
import { TrendChart } from '@/components/charts/TrendChart';
import { api } from '@/lib/api';
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

  const chartLabels = data.rows.map((r) => r.date.slice(5));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.accent} />}
    >
      <View style={styles.grid}>
        <StatTile
          label="Trainingsbereitschaft"
          value={data.stats.readinessScoreV2 ?? '–'}
          unit="/ 100"
          hint={data.stats.readinessVerdict ?? undefined}
          tone={(data.stats.readinessScoreV2 ?? 50) < 25 ? 'negative' : (data.stats.readinessScoreV2 ?? 50) >= 60 ? 'positive' : 'neutral'}
        />
        <StatTile
          label="Recovery Score"
          value={data.stats.recoveryScore ?? '–'}
          unit="/ 100"
          tone={(data.stats.recoveryScore ?? 50) < 25 ? 'negative' : (data.stats.recoveryScore ?? 50) >= 60 ? 'positive' : 'neutral'}
        />
        <StatTile label="HRV" value={data.stats.hrv ?? '–'} unit="ms" hint={`Trend: ${data.stats.hrvTrend}`} tone={data.stats.hrvTrend === 'declining' ? 'negative' : 'neutral'} />
        <StatTile label="Ruhepuls" value={data.stats.restingHr ?? '–'} unit="bpm" hint={`Trend: ${data.stats.rhrTrend}`} tone={data.stats.rhrTrend === 'rising' ? 'negative' : 'neutral'} />
        <StatTile label="Schlaf" value={data.stats.sleepScoreAvg} unit="Score" hint={`Ø ${data.stats.sleepHoursAvg} h`} />
        <StatTile label="Form (TSB)" value={data.stats.tsb ?? '–'} tone={(data.stats.tsb ?? 0) < -20 ? 'negative' : (data.stats.tsb ?? 0) > 15 ? 'positive' : 'neutral'} />
        <StatTile label="Überlastungsrisiko" value={data.stats.injuryRiskIndex} unit="Index" tone={data.stats.injuryRiskIndex >= 30 ? 'negative' : data.stats.injuryRiskIndex >= 12 ? 'neutral' : 'positive'} />
        <StatTile label="Aktive Ziele" value={data.stats.goalsCount} />
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

      <Card title="HRV (14 Tage)" subtitle="Herzfrequenzvariabilität">
        <TrendChart labels={chartLabels} data={data.rows.map((r) => r.hrv)} color={Colors.accent} />
        <ExplanationPanel explanation={data.explanations.hrv} />
      </Card>

      <Card title="Ruhepuls (14 Tage)">
        <TrendChart labels={chartLabels} data={data.rows.map((r) => r.restingHr)} color={Colors.warning} />
        <ExplanationPanel explanation={data.explanations.rhr} />
      </Card>

      <Card title="Form / TSB (14 Tage)" subtitle="Training Stress Balance">
        <TrendChart labels={chartLabels} data={data.rows.map((r) => r.tsb)} color={Colors.positive} />
        <ExplanationPanel explanation={data.explanations.load} />
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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
});
