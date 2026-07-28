import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Flame, Gauge, HeartPulse, TrendingUp, Zap } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ActivityHrZones } from '@/components/charts/ActivityHrZones';
import { StrengthLogSection } from '@/components/training/StrengthLogSection';
import { NotesSection } from '@/components/training/NotesSection';
import { ActivityDetailsSection } from '@/components/training/ActivityDetailsSection';
import { api } from '@/lib/api';
import { activityLabel, formatActivityPace, formatDate, formatDistance, formatDuration } from '@/lib/format';
import type { Activity } from '@/lib/types';

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.training().then((res) => {
      const found = res.activities.find((a) => String(a.activityId) === id);
      setActivity(found ?? null);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: Colors.muted }}>Einheit nicht gefunden.</Text>
      </View>
    );
  }

  const pace = formatActivityPace(activity);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: activity.activityName }} />

      <View style={styles.grid}>
        <Card style={styles.tile}>
          <View style={styles.tileHeader}>
            <HeartPulse size={13} color={Colors.muted} />
            <Text style={styles.tileLabel}>Herzfrequenz</Text>
          </View>
          <Text style={styles.tileValue}>{activity.averageHeartRateInBeatsPerMinute ?? '–'} <Text style={styles.tileUnit}>Ø bpm</Text></Text>
          <Text style={styles.tileHint}>Max {activity.maxHeartRateInBeatsPerMinute ?? '–'} bpm</Text>
        </Card>
        <Card style={styles.tile}>
          <View style={styles.tileHeader}>
            <Gauge size={13} color={Colors.muted} />
            <Text style={styles.tileLabel}>Dauer / Distanz</Text>
          </View>
          <Text style={styles.tileValue}>{formatDuration(activity.durationInSeconds)}</Text>
          <Text style={styles.tileHint}>{formatDistance(activity.distanceInMeters)}</Text>
        </Card>
        <Card style={styles.tile}>
          <View style={styles.tileHeader}>
            <TrendingUp size={13} color={Colors.muted} />
            <Text style={styles.tileLabel}>Tempo</Text>
          </View>
          <Text style={styles.tileValue}>{pace ?? '–'}</Text>
          {!!activity.avgCadence && <Text style={styles.tileHint}>Kadenz Ø {activity.avgCadence.toFixed(0)}</Text>}
        </Card>
        <Card style={styles.tile}>
          <View style={styles.tileHeader}>
            <Flame size={13} color={Colors.muted} />
            <Text style={styles.tileLabel}>Kalorien</Text>
          </View>
          <Text style={styles.tileValue}>{activity.activeKilocalories} kcal</Text>
          {activity.trainingLoad !== undefined && <Text style={styles.tileHint}>Load {activity.trainingLoad.toFixed(0)}</Text>}
        </Card>
      </View>

      <Text style={styles.meta}>
        {activityLabel(activity.activityType)} · {formatDate(activity.startTimeInSeconds)}
      </Text>

      {activity.hrZones && (
        <Card title="Herzfrequenz-Zonen">
          <ActivityHrZones zones={activity.hrZones} />
        </Card>
      )}

      {(activity.intensityFactor !== undefined || activity.efficiencyFactor !== undefined || activity.avgPower !== undefined) && (
        <Card title="Leistungskennzahlen">
          <View style={{ gap: 8 }}>
            {activity.avgPower !== undefined && (
              <Row icon={<Zap size={13} color={Colors.muted} />} label="Ø Leistung" value={`${activity.avgPower} W`} />
            )}
            {activity.normalizedPower !== undefined && <Row label="Normalisierte Leistung" value={`${activity.normalizedPower} W`} />}
            {activity.intensityFactor !== undefined && <Row label="Intensitätsfaktor" value={activity.intensityFactor.toFixed(2)} />}
            {activity.efficiencyFactor !== undefined && <Row label="Effizienzfaktor" value={activity.efficiencyFactor.toFixed(2)} />}
          </View>
        </Card>
      )}

      <ActivityDetailsSection activityId={activity.activityId} />

      {activity.activityType === 'STRENGTH_TRAINING' && (
        <StrengthLogSection
          activityId={activity.activityId}
          date={new Date(activity.startTimeInSeconds * 1000).toISOString().slice(0, 10)}
          defaultTitle={activity.activityName}
        />
      )}

      <NotesSection activityId={activity.activityId} />
    </ScrollView>
  );
}

function Row({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon}
        <Text style={{ color: Colors.muted, fontSize: 13 }}>{label}</Text>
      </View>
      <Text style={{ color: Colors.foreground, fontSize: 13, fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  meta: { fontSize: 12, color: Colors.muted, marginTop: -8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexBasis: '48%', flexGrow: 1, padding: 12 },
  tileHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  tileLabel: { fontSize: 11, color: Colors.muted },
  tileValue: { fontSize: 17, fontWeight: '600', color: Colors.foreground },
  tileUnit: { fontSize: 11, fontWeight: '400', color: Colors.muted },
  tileHint: { fontSize: 11, color: Colors.muted, marginTop: 2 },
});
