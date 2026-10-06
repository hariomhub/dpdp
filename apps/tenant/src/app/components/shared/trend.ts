export interface Trend {
  direction: 'up' | 'down' | 'flat';
  label: string;
}

/** Raw delta between the latest point and ~7 points back — undefined without enough history. */
export function computeDelta(series: number[]): number | undefined {
  if (series.length < 2) return undefined;
  const latest = series[series.length - 1];
  const compareIdx = Math.max(0, series.length - 8); // ~7 days back
  return latest - series[compareIdx];
}

/** Trend direction/label from a real time series — undefined without enough history yet. */
export function computeTrend(series: number[], unit = ''): Trend | undefined {
  const diff = computeDelta(series);
  if (diff === undefined) return undefined;
  const direction = diff > 0 ? 'up' as const : diff < 0 ? 'down' as const : 'flat' as const;
  const sign = diff > 0 ? '+' : '';
  return { direction, label: `${sign}${diff}${unit} vs 7d ago` };
}
