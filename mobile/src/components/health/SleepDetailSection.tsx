import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/theme';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';

const STAGE_COLORS: Record<string, string> = {
  Tiefschlaf: '#3b82f6',
  Leichtschlaf: '#60a5fa',
  REM: '#c084fc',
  Wach: '#f87171',
};

function formatMinutes(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export function SleepDetailSection() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.sleepDetail>> | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .sleepDetail()
      .then((d) => {
        setData(d);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || !data?.hasData) return null;

  const stages = [
    { label: 'Tiefschlaf', seconds: data.deepSec },
    { label: 'Leichtschlaf', seconds: data.lightSec },
    { label: 'REM', seconds: data.remSec },
    { label: 'Wach', seconds: data.awakeSec },
  ].filter((s): s is { label: string; seconds: number } => s.seconds !== null);
  const total = stages.reduce((sum, s) => sum + s.seconds, 0);

  return (
    <Card title="Schlafdetails (letzte Nacht)" subtitle={formatDate(data.date)}>
      <View style={styles.statsRow}>
        {data.score !== null && (
          <View>
            <Text style={styles.statValue}>
              {data.score} <Text style={styles.statUnit}>/ 100</Text>
            </Text>
            <Text style={styles.statLabel}>{data.scoreQualifier}</Text>
          </View>
        )}
        <View>
          <Text style={styles.statValue}>{formatMinutes(data.durationSec)}</Text>
          <Text style={styles.statLabel}>Gesamtschlafdauer</Text>
        </View>
        {data.overnightHrv !== null && (
          <View>
            <Text style={styles.statValue}>{data.overnightHrv} ms</Text>
            <Text style={styles.statLabel}>Ø HFV über Nacht</Text>
          </View>
        )}
      </View>

      {total > 0 && (
        <View style={{ marginTop: 14, gap: 8 }}>
          <View style={styles.stageBar}>
            {stages.map((s) => (
              <View key={s.label} style={{ flex: s.seconds, backgroundColor: STAGE_COLORS[s.label] }} />
            ))}
          </View>
          <View style={styles.legend}>
            {stages.map((s) => (
              <View key={s.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: STAGE_COLORS[s.label] }]} />
                <Text style={styles.legendText}>
                  {s.label}: {formatMinutes(s.seconds)} ({((s.seconds / total) * 100).toFixed(0)}%)
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {data.factors.length > 0 && (
        <View style={styles.factorGrid}>
          {data.factors.map((f) => (
            <View key={f.label} style={styles.factorBox}>
              <Text style={styles.factorLabel}>{f.label}</Text>
              <Text style={styles.factorValue}>{f.value}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 20, flexWrap: 'wrap' },
  statValue: { fontSize: 20, fontWeight: '600', color: Colors.foreground },
  statUnit: { fontSize: 12, fontWeight: '400', color: Colors.muted },
  statLabel: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  stageBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: Colors.surfaceRaised },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 11, color: Colors.muted },
  factorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
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
