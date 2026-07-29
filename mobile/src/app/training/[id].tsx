import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Flame, Gauge, HeartPulse, TrendingUp, Zap } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ActivityHrZones } from '@/components/charts/ActivityHrZones';
import { ExpandableTimeSeriesChart, type SeriesMetric } from '@/components/charts/ExpandableTimeSeriesChart';
import { StrengthLogSection } from '@/components/training/StrengthLogSection';
import { NotesSection } from '@/components/training/NotesSection';
import { TrainingLogSection } from '@/components/training/TrainingLogSection';
import { ActivitySummaryCard } from '@/components/training/ActivitySummaryCard';
import { LapsTable } from '@/components/training/LapsTable';
import { api } from '@/lib/api';
import { activityLabel, formatActivityPace, formatDate, formatDistance, formatDuration } from '@/lib/format';
import type { Activity } from '@/lib/types';

type ActivityDetails = Awaited<ReturnType<typeof api.activityDetails>>;

const TABS = ['Übersicht', 'Herzfrequenz', 'Diagramme', 'Splits', 'Protokoll'] as const;
type Tab = (typeof TABS)[number];

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [details, setDetails] = useState<ActivityDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('Übersicht');

  useEffect(() => {
    setTab('Übersicht');
    api.training().then((res) => {
      const found = res.activities.find((a) => String(a.activityId) === id);
      setActivity(found ?? null);
      setLoading(false);
      if (found) {
        api
          .activityDetails(found.activityId)
          .then(setDetails)
          .catch(() => setDetails(null));
      }
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
  const series = details?.hasDetails ? details.series : [];
  const availableChartMetrics: SeriesMetric[] = (['speedKmh', 'altitudeM', 'cadence', 'power'] as SeriesMetric[]).filter(
    (m) => series.some((p) => p[m] !== null)
  );
  const hasHrSeries = series.some((p) => p.heartRate !== null);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: activity.activityName }} />

      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
          {TABS.map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabPill, tab === t && styles.tabPillActive]}>
              <Text style={[styles.tabPillText, tab === t && styles.tabPillTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {tab === 'Übersicht' && (
          <>
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

            <ActivitySummaryCard activityId={activity.activityId} />

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

            {details?.hasDetails && (
              <Card title="Weitere Garmin-Daten">
                <View style={styles.detailGrid}>
                  {details.trainingEffect != null && <Row label="Trainingswirkung (aerob)" value={details.trainingEffect.toFixed(1)} />}
                  {details.anaerobicTrainingEffect != null && <Row label="Trainingswirkung (anaerob)" value={details.anaerobicTrainingEffect.toFixed(1)} />}
                  {details.totalAscent != null && <Row label="Höhenmeter (hoch)" value={`${details.totalAscent.toFixed(0)} m`} />}
                  {details.totalDescent != null && <Row label="Höhenmeter (runter)" value={`${details.totalDescent.toFixed(0)} m`} />}
                  {details.sweatLossMl != null && <Row label="Geschätzter Schweißverlust" value={`${(details.sweatLossMl / 1000).toFixed(2)} l`} />}
                  {details.rpe != null && <Row label="Empfundene Anstrengung (RPE)" value={`${details.rpe} / 10`} />}
                </View>
              </Card>
            )}
          </>
        )}

        {tab === 'Herzfrequenz' && (
          <>
            {activity.hrZones && (
              <Card title="Herzfrequenz-Zonen">
                <ActivityHrZones zones={activity.hrZones} />
              </Card>
            )}
            {hasHrSeries ? (
              <ExpandableTimeSeriesChart series={series} metrics={['heartRate']} title="Herzfrequenz über Zeit" />
            ) : (
              <Text style={styles.hint}>Kein zeitbasierter Herzfrequenzverlauf für diese Einheit verfügbar.</Text>
            )}
          </>
        )}

        {tab === 'Diagramme' && (
          <>
            {availableChartMetrics.length > 0 ? (
              <ExpandableTimeSeriesChart series={series} metrics={availableChartMetrics} />
            ) : (
              <Text style={styles.hint}>Keine zeitbasierten Diagrammdaten für diese Einheit verfügbar.</Text>
            )}
          </>
        )}

        {tab === 'Splits' && (details?.hasDetails && details.laps.length > 0 ? (
          <LapsTable laps={details.laps} />
        ) : (
          <Text style={styles.hint}>Keine Runden/Splits für diese Einheit verfügbar.</Text>
        ))}

        {tab === 'Protokoll' && (
          <>
            <TrainingLogSection
              activityId={activity.activityId}
              date={new Date(activity.startTimeInSeconds * 1000).toISOString().slice(0, 10)}
            />
            {activity.activityType === 'STRENGTH_TRAINING' && (
              <StrengthLogSection
                activityId={activity.activityId}
                date={new Date(activity.startTimeInSeconds * 1000).toISOString().slice(0, 10)}
                defaultTitle={activity.activityName}
              />
            )}
            <NotesSection activityId={activity.activityId} />
          </>
        )}
      </ScrollView>
    </View>
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
  content: { flex: 1 },
  contentInner: { padding: 16, gap: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  meta: { fontSize: 12, color: Colors.muted, marginTop: -8 },
  hint: { color: Colors.muted, fontSize: 13, textAlign: 'center', paddingVertical: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexBasis: '48%', flexGrow: 1, padding: 12 },
  tileHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  tileLabel: { fontSize: 11, color: Colors.muted },
  tileValue: { fontSize: 17, fontWeight: '600', color: Colors.foreground },
  tileUnit: { fontSize: 11, fontWeight: '400', color: Colors.muted },
  tileHint: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  detailGrid: { gap: 8 },
  tabBar: { borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 10, backgroundColor: Colors.background },
  tabPill: { borderWidth: 1, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  tabPillActive: { backgroundColor: Colors.accentSoft, borderColor: Colors.accent },
  tabPillText: { color: Colors.muted, fontSize: 13 },
  tabPillTextActive: { color: Colors.accent, fontWeight: '600' },
});
