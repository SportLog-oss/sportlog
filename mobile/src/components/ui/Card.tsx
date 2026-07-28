import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';

export function Card({
  children,
  title,
  subtitle,
  style,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.card, style]}>
      {(title || subtitle) && (
        <View style={styles.header}>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
  },
});
