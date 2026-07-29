import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import type { ReminderPreferences, ReminderType } from '@/lib/types';

const TYPE_LABELS: Record<ReminderType, string> = {
  'log-training': 'Training protokollieren',
  'update-illness': 'Krankheitsstatus aktualisieren',
  'log-mental-health': 'Mentaler Check-in',
  'daily-checkin': 'Allgemeiner Tagescheck',
};

export function ReminderSettingsCard() {
  const [prefs, setPrefs] = useState<ReminderPreferences | null>(null);

  useEffect(() => {
    api.reminderPreferences.get().then(setPrefs);
  }, []);

  async function toggle(type: ReminderType) {
    if (!prefs) return;
    const enabledTypes = prefs.enabledTypes.includes(type)
      ? prefs.enabledTypes.filter((t) => t !== type)
      : [...prefs.enabledTypes, type];
    setPrefs({ ...prefs, enabledTypes });
    await api.reminderPreferences.update({ enabledTypes });
  }

  if (!prefs) return null;

  return (
    <Card title="Erinnerungen" subtitle="Einmal täglich, nur wenn etwas offen ist">
      <View style={{ gap: 10 }}>
        {(Object.keys(TYPE_LABELS) as ReminderType[]).map((type) => (
          <View key={type} style={styles.row}>
            <Text style={styles.label}>{TYPE_LABELS[type]}</Text>
            <Switch
              value={prefs.enabledTypes.includes(type)}
              onValueChange={() => toggle(type)}
              trackColor={{ true: Colors.accent, false: Colors.border }}
            />
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: Colors.foreground, fontSize: 13, flex: 1, marginRight: 8 },
});
