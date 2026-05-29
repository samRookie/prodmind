import type { TrendSignal } from './trend-detection.ts';

export function rankTrends(signals: TrendSignal[]): TrendSignal[] {
  return [...signals].sort((a, b) => b.strength - a.strength);
}

export function getTopTrends(signals: TrendSignal[], count: number): TrendSignal[] {
  return rankTrends(signals).slice(0, count);
}

export function getWorseningTrends(signals: TrendSignal[]): TrendSignal[] {
  return signals.filter(
    (s) => (s.trend === 'increasing' && s.slope > 0) || (s.trend === 'volatile'),
  );
}
