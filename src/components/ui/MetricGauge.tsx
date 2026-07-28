const START_ANGLE = -130;
const END_ANGLE = 130;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
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

  const color = pct < 25 ? "var(--negative)" : pct < 60 ? "var(--warning)" : "var(--positive)";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path
        d={describeArc(cx, cy, r, START_ANGLE, END_ANGLE)}
        fill="none"
        stroke="var(--border)"
        strokeWidth={10}
        strokeLinecap="round"
      />
      <path
        d={describeArc(cx, cy, r, START_ANGLE, valueAngle)}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
      />
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize={size * 0.26} fontWeight={600} fill="var(--foreground)">
        {clamped.toFixed(decimals)}
      </text>
      <text x={cx} y={cy + size * 0.16} textAnchor="middle" fontSize={size * 0.09} fill="var(--muted)">
        / {max}
      </text>
      {label && (
        <text x={cx} y={cy + size * 0.32} textAnchor="middle" fontSize={size * 0.09} fill={color} fontWeight={600}>
          {label}
        </text>
      )}
    </svg>
  );
}
