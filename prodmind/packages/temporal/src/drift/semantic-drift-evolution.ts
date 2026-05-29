import type { EvolutionPoint, MetricTrajectory } from '../types/index.ts';
import { calculateAcceleration, calculateSlope, calculateVolatility, determineTrend } from '../utils/index.ts';

export function analyzeSemanticDriftEvolution(points: EvolutionPoint[]): MetricTrajectory {
  const semanticPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.semanticScore }));
  return {
    metricName: 'semantic_drift',
    points: semanticPoints,
    slope: calculateSlope(semanticPoints),
    acceleration: calculateAcceleration(semanticPoints),
    volatility: calculateVolatility(semanticPoints),
    trend: determineTrend(semanticPoints),
  };
}
