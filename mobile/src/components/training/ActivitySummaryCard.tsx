import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';

export function ActivitySummaryCard({ activityId }: { activityId: number }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const { summary } = await api.activitySummary(activityId);
      setSummary(summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Zusammenfassung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="KI-Zusammenfassung">
      {summary ? (
        <Text style={styles.text}>{summary}</Text>
      ) : (
        <View style={{ gap: 10 }}>
          <Text style={styles.hint}>Lass dir eine kurze Einschätzung dieser Einheit generieren: was lief gut, Auffälligkeiten, Belastung & Erholung, Verbesserungsvorschläge.</Text>
          <Pressable onPress={generate} disabled={loading} style={styles.button}>
            {loading ? <ActivityIndicator size="small" color="#000" /> : <Sparkles size={15} color="#000" />}
            <Text style={styles.buttonText}>{loading ? 'Generiere…' : 'Zusammenfassung generieren'}</Text>
          </Pressable>
          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  text: { color: Colors.foreground, fontSize: 13, lineHeight: 20 },
  hint: { color: Colors.muted, fontSize: 12, lineHeight: 17 },
  button: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accent, borderRadius: 10, paddingVertical: 10 },
  buttonText: { color: '#000', fontWeight: '600', fontSize: 13 },
  error: { color: Colors.negative, fontSize: 12 },
});
