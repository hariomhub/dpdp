import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

// Compact inline trend line for a KPI tile — no axes/grid/tooltip, just
// shape. Renders nothing if there isn't enough data to show a trend yet.
export function Sparkline({ data, color = '#1A3E5C', width = 64, height = 24 }: SparklineProps) {
  if (data.length < 2) return null;
  const points = data.map((value, i) => ({ i, value }));
  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
