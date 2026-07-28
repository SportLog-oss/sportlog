import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Bike, Dumbbell, Waves, Footprints, Activity as ActivityIcon } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { HrZonesBars } from '@/components/charts/HrZonesBars';
import { TrendChart } from '@/components/charts/TrendChart';
import { api } from '@/lib/api';
import { activityLabel, formatDate, formatDistance, formatDuration, formatDurationLabel, formatPace } from '@/lib/format';
import type { TrainingResponse } from '@/lib/types';

const ICONS: Record<string, typeof Bike> = {
  CYCLING: Bike,
  STRENGTH_TRAINING: Dumbbell,
  ROWING_V2: Waves,
  INDOOR_ROWING: Waves,
  RUNNING: Footprints,
  WALKING: Footprints,
};

export default function TrainingScreen() {
  const [data, setData] = useState<TrainingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setData(await api.training());
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.accent} />}
    >
      <Card title="Herzfrequenz-Zonen" subtitle={`${data.hrZones.total_hours}h gesamt`}>
        <HrZonesBars zones={data.hrZones.zones} />
      </Card>

      <Card title="Leistungsprofil">
        <View style={{ gap: 6 }}>
          <Row label="FTP" value={`${data.performance.ftp_watts.toFixed(0)} W`} />
          <Row label="Archetyp" value={data.performance.power_profile.archetype.replace('_', ' ')} />
          <Row label="Stärken" value={data.performance.power_profile.strengths.join(', ')} />
          <Row label="Schwächen" value={data.performance.power_profile.limiters.join(', ')} />
        </View>
      </Card>

      <Card title="Leistungskurve (Rad)" subtitle="Bestwerte, 90 Tage">
        <TrendChart
          labels={data.curves.power.points.map((p) => formatDurationLabel(p.durationSec))}
          data={data.curves.power.points.map((p) => p.bestValue)}
          color={Colors.accent}
          suffix="W"
        />
      </Card>

      <View style={{ gap: 10 }}>
        <Text style={styles.sectionLabel}>Letzte Einheiten</Text>
        {data.activities.map((act) => {
          const Icon = ICONS[act.activityType] ?? ActivityIcon;
          const pace = formatPace(act.averagePaceInMinutesPerKilometer);
          return (
            <View key={act.activityId} style={styles.activityRow}>
              <View style={styles.iconWrap}>
                <Icon size={17} color={Colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityName}>{act.activityName}</Text>
                <Text style={styles.activityMeta}>
                  {activityLabel(act.activityType)} · {formatDate(act.startTimeInSeconds)}
                </Text>
                <Text style={styles.activityMeta}>
                  {formatDuration(act.durationInSeconds)}
                  {act.distanceInMeters > 0 ? ` · ${formatDistance(act.distanceInMeters)}` : ''}
                  {pace ? ` · ${pace}` : ''}
                  {act.averageHeartRateInBeatsPerMinute ? ` · Ø ${act.averageHeartRateInBeatsPerMinute} bpm` : ''}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: Colors.muted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: Colors.foreground, fontSize: 13, fontWeight: '500', textTransform: 'capitalize' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  activityRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityName: { fontSize: 13, fontWeight: '600', color: Colors.foreground },
  activityMeta: { fontSize: 12, color: Colors.muted, marginTop: 2 },
});
