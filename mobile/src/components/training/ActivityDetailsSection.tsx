import { Fragment, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/theme';
import { api } from '@/lib/api';
import { LapsTable } from '@/components/training/LapsTable';

export function ActivityDetailsSection({ activityId }: { activityId: number }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.activityDetails>> | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .activityDetails(activityId)
      .then((d) => {
        setData(d);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [activityId]);

  if (!loaded || !data?.hasDetails) return null;

  const items: { label: string; value: string }[] = [];
  if (data.trainingEffect != null) items.push({ label: 'Trainingswirkung (aerob)', value: data.trainingEffect.toFixed(1) });
  if (data.anaerobicTrainingEffect != null)
    items.push({ label: 'Trainingswirkung (anaerob)', value: data.anaerobicTrainingEffect.toFixed(1) });
  if (data.totalAscent != null) items.push({ label: 'Höhenmeter (hoch)', value: `${data.totalAscent.toFixed(0)} m` });
  if (data.totalDescent != null) items.push({ label: 'Höhenmeter (runter)', value: `${data.totalDescent.toFixed(0)} m` });
  if (data.sweatLossMl != null) items.push({ label: 'Geschätzter Schweißverlust', value: `${(data.sweatLossMl / 1000).toFixed(2)} l` });
  if (data.rpe != null) items.push({ label: 'Empfundene Anstrengung (RPE)', value: `${data.rpe} / 10` });

  return (
    <Fragment>
      <LapsTable laps={data.laps} />
      {items.length > 0 && (
        <Card title="Weitere Garmin-Daten">
          <View style={styles.grid}>
            {items.map((item) => (
              <View key={item.label} style={styles.item}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.value}>{item.value}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}
    </Fragment>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  item: { flexBasis: '30%', flexGrow: 1 },
  label: { fontSize: 11, color: Colors.muted },
  value: { fontSize: 14, fontWeight: '600', color: Colors.foreground, marginTop: 2 },
});
