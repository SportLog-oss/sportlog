import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import type { Warning } from '@/lib/types';

const CONFIG = {
  info: { icon: Info, color: Colors.accent, bg: Colors.accentSoft },
  warning: { icon: AlertTriangle, color: Colors.warning, bg: 'rgba(251,191,36,0.1)' },
  critical: { icon: ShieldAlert, color: Colors.negative, bg: 'rgba(248,113,113,0.1)' },
} as const;

export function WarningBanner({ warning }: { warning: Warning }) {
  const { icon: Icon, color, bg } = CONFIG[warning.level];
  return (
    <View style={[styles.container, { backgroundColor: bg, borderColor: `${color}55` }]}>
      <Icon size={18} color={color} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{warning.title}</Text>
        <Text style={styles.message}>{warning.message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.foreground,
  },
  message: {
    fontSize: 13,
    color: Colors.foreground,
    opacity: 0.85,
    marginTop: 2,
    lineHeight: 18,
  },
});
