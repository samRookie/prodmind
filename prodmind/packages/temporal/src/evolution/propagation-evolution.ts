import type { EvolutionPoint, MetricTrajectory } from '../types/index.ts';
import { calculateAcceleration, calculateSlope, calculateVolatility, determineTrend } from '../utils/index.ts';

export function analyzePropagationEvolution(points: EvolutionPoint[]): MetricTrajectory {
  const metricPoints = points.map((p) => ({
    timestamp: p.timestamp,
    value: p.propagation,
  }));
  return {
    metricName: 'propagation',
    points: metricPoints,
    slope: calculateSlope(metricPoints),
    acceleration: calculateAcceleration(metricPoints),
    volatility: calculateVolatility(metricPoints),
    trend: determineTrend(metricPoints),
  };
}
