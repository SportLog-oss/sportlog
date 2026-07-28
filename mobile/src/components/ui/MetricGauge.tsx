import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '@/constants/theme';

const START_ANGLE = -130;
const END_ANGLE = 130;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export function MetricGauge({
  value,
  max = 100,
  label,
  size = 132,
  decimals = 0,
}: {
  value: number;
  max?: number;
  label?: string;
  size?: number;
  decimals?: number;
}) {
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const clamped = Math.max(0, Math.min(max, value));
  const pct = (clamped / max) * 100;
  const sweep = END_ANGLE - START_ANGLE;
  const valueAngle = START_ANGLE + (clamped / max) * sweep;

  const color = pct < 25 ? Colors.negative : pct < 60 ? Colors.warning : Colors.positive;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Path
          d={describeArc(cx, cy, r, START_ANGLE, END_ANGLE)}
          fill="none"
          stroke={Colors.border}
          strokeWidth={10}
          strokeLinecap="round"
        />
        <Path
          d={describeArc(cx, cy, r, START_ANGLE, valueAngle)}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
        />
      </Svg>
      <View style={StyleSheet.absoluteFillObject}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Text style={{ fontSize: size * 0.26, fontWeight: '600', color: Colors.foreground }}>{clamped.toFixed(decimals)}</Text>
          <Text style={{ fontSize: size * 0.09, color: Colors.muted }}>/ {max}</Text>
          {!!label && (
            <Text style={{ fontSize: size * 0.09, color, fontWeight: '600', marginTop: 2 }}>{label}</Text>
          )}
        </View>
      </View>
    </View>
  );
}
