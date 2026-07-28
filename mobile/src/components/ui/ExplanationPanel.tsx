import { StyleSheet, Text, View } from 'react-native';
import { TrendingUp, TrendingDown, Minus, Lightbulb } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import type { Explanation } from '@/lib/types';

export function ExplanationPanel({ explanation }: { explanation: Explanation }) {
  const Icon = explanation.sentiment === 'positive' ? TrendingUp : explanation.sentiment === 'negative' ? TrendingDown : Minus;
  const color =
    explanation.sentiment === 'positive' ? Colors.positive : explanation.sentiment === 'negative' ? Colors.negative : Colors.muted;

  return (
    <View style={[styles.container, { borderColor: `${color}55` }]}>
      <View style={styles.headlineRow}>
        <Icon size={16} color={color} />
        <Text style={[styles.headline, { color }]}>{explanation.headline}</Text>
      </View>
      <Text style={styles.body}>{explanation.body}</Text>
      <View style={styles.recommendationRow}>
        <Lightbulb size={15} color={Colors.accent} style={{ marginTop: 1 }} />
        <Text style={styles.recommendation}>{explanation.recommendation}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: Colors.surfaceRaised,
    padding: 14,
    gap: 8,
    marginTop: 12,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headline: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  body: {
    fontSize: 13,
    color: Colors.foreground,
    lineHeight: 19,
    opacity: 0.9,
  },
  recommendationRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  recommendation: {
    fontSize: 13,
    color: Colors.foreground,
    flex: 1,
    lineHeight: 19,
  },
});
