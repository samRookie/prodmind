import type { EvolutionPoint, MetricTrajectory } from '../types/index.ts';
import { calculateAcceleration, calculateSlope, calculateVolatility, determineTrend } from '../utils/index.ts';

export function analyzeDependencyDriftEvolution(points: EvolutionPoint[]): MetricTrajectory {
  const depPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.coupling }));
  return {
    metricName: 'dependency_drift',
    points: depPoints,
    slope: calculateSlope(depPoints),
    acceleration: calculateAcceleration(depPoints),
    volatility: calculateVolatility(depPoints),
    trend: determineTrend(depPoints),
  };
}
