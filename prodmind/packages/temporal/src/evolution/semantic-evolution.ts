import type { EvolutionPoint, MetricTrajectory } from '../types/index.ts';
import { calculateAcceleration, calculateSlope, calculateVolatility, determineTrend } from '../utils/index.ts';

export function analyzeSemanticEvolution(points: EvolutionPoint[]): MetricTrajectory {
  const metricPoints = points.map((p) => ({
    timestamp: p.timestamp,
    value: p.semanticScore,
  }));
  return {
    metricName: 'semantic',
    points: metricPoints,
    slope: calculateSlope(metricPoints),
    acceleration: calculateAcceleration(metricPoints),
    volatility: calculateVolatility(metricPoints),
    trend: determineTrend(metricPoints),
  };
}

export function analyzeDriftEvolution(points: EvolutionPoint[]): MetricTrajectory {
  const metricPoints = points.map((p) => ({
    timestamp: p.timestamp,
    value: p.driftScore,
  }));
  return {
    metricName: 'drift',
    points: metricPoints,
    slope: calculateSlope(metricPoints),
    acceleration: calculateAcceleration(metricPoints),
    volatility: calculateVolatility(metricPoints),
    trend: determineTrend(metricPoints),
  };
}
