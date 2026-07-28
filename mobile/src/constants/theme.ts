import { Platform } from 'react-native';

export const Colors = {
  background: '#0a0e14',
  surface: '#12171f',
  surfaceRaised: '#1a212b',
  border: '#232b37',
  foreground: '#e8edf3',
  muted: '#8b96a5',
  accent: '#2dd4bf',
  accentSoft: 'rgba(45, 212, 191, 0.14)',
  positive: '#34d399',
  warning: '#fbbf24',
  negative: '#f87171',
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    mono: 'monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;
