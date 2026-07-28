import { Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Colors } from '@/constants/theme';

const screenWidth = Dimensions.get('window').width;

function hexToRgb(hex: string): string {
  const parsed = hex.replace('#', '');
  const bigint = parseInt(parsed, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}

export function TrendChart({
  labels,
  data,
  color = Colors.accent,
  suffix = '',
}: {
  labels: string[];
  data: (number | null)[];
  color?: string;
  suffix?: string;
}) {
  const cleanData = data.map((d) => (d === null || Number.isNaN(d) ? 0 : d));
  const rgb = hexToRgb(color);

  return (
    <LineChart
      data={{
        labels,
        datasets: [{ data: cleanData.length > 0 ? cleanData : [0] }],
      }}
      width={screenWidth - 64}
      height={180}
      yAxisSuffix={suffix}
      withInnerLines={false}
      withOuterLines={false}
      chartConfig={{
        backgroundColor: Colors.surface,
        backgroundGradientFrom: Colors.surface,
        backgroundGradientTo: Colors.surface,
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(${rgb}, ${opacity})`,
        labelColor: () => Colors.muted,
        propsForDots: { r: '0' },
        propsForBackgroundLines: { stroke: Colors.border },
      }}
      bezier
      style={{ borderRadius: 12, marginLeft: -16 }}
    />
  );
}
