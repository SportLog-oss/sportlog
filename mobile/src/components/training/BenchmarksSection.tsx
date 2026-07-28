import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { ChevronDown, ChevronUp, Trophy } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { TrendChart } from '@/components/charts/TrendChart';
import { api } from '@/lib/api';
import type { Benchmark } from '@/lib/types';

const ERGO_PRESETS = [
  '350m Sprint',
  '1000m Dorfregatten',
  '1500m B-Junior Distance',
  '2000m normale Distance',
  '6000m Langstrecke',
];

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function parseClockToSeconds(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.includes(':')) {
    const [m, s] = trimmed.split(':').map(Number);
    if (Number.isNaN(m) || Number.isNaN(s)) return null;
    return m * 60 + s;
  }
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : n;
}

export function BenchmarksSection() {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [times, setTimes] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.benchmarks.list().then(setBenchmarks).catch(() => {});
  }, []);

  function toggleExpanded(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function submitEntry(name: string) {
    const value = parseClockToSeconds(times[name] ?? '');
    if (value == null) return;
    const date = new Date().toISOString().slice(0, 10);
    const existing = benchmarks.find((b) => b.name === name);

    if (existing) {
      const updated = await api.benchmarks.addEntry(existing.id, { date, value });
      setBenchmarks((bs) => bs.map((b) => (b.id === existing.id ? updated : b)));
    } else {
      const created = await api.benchmarks.create({
        name,
        kind: 'time',
        unit: 's',
        lowerIsBetter: true,
        firstValue: value,
        firstDate: date,
      });
      setBenchmarks((bs) => [...bs, created]);
    }
    setTimes((t) => ({ ...t, [name]: '' }));
  }

  return (
    <Card title="Bestwerte & Testkurven" subtitle="Ergo-Distanzen — Zeit eintragen und Verlauf verfolgen">
      <View>
        {ERGO_PRESETS.map((name, i) => {
          const b = benchmarks.find((x) => x.name === name);
          const best = b && b.entries.length > 0 ? Math.min(...b.entries.map((e) => e.value)) : null;
          const isOpen = expanded.has(name);
          return (
            <View key={name} style={i > 0 ? styles.row : undefined}>
              <Pressable style={styles.rowHeader} onPress={() => toggleExpanded(name)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Trophy size={15} color={Colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{name}</Text>
                    <Text style={styles.itemMeta}>
                      {best != null ? `Bestzeit ${formatClock(best)} · ${b!.entries.length} Einträge` : 'Noch keine Einträge'}
                    </Text>
                  </View>
                </View>
                {isOpen ? <ChevronUp size={16} color={Colors.muted} /> : <ChevronDown size={16} color={Colors.muted} />}
              </Pressable>

              {isOpen && (
                <View style={styles.rowContent}>
                  {b && b.entries.length >= 2 && (
                    <TrendChart
                      labels={b.entries.map((e) => e.date.slice(5))}
                      data={b.entries.map((e) => e.value)}
                      color={Colors.accent}
                      decimalPlaces={0}
                    />
                  )}
                  <View style={styles.entryRow}>
                    <TextInput
                      style={styles.input}
                      placeholder="m:ss"
                      placeholderTextColor={Colors.muted}
                      value={times[name] ?? ''}
                      onChangeText={(t) => setTimes((s) => ({ ...s, [name]: t }))}
                    />
                    <Pressable style={styles.submitButton} onPress={() => submitEntry(name)}>
                      <Text style={styles.submitButtonText}>Eintragen</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4, paddingTop: 4 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  rowContent: { paddingBottom: 10, gap: 10 },
  itemTitle: { fontSize: 13, fontWeight: '600', color: Colors.foreground },
  itemMeta: { fontSize: 12, color: Colors.muted, marginTop: 1 },
  entryRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: Colors.foreground,
    fontSize: 13,
  },
  submitButton: { backgroundColor: Colors.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  submitButtonText: { color: '#000', fontWeight: '600', fontSize: 13 },
});
