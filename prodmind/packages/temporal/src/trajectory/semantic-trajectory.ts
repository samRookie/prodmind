import type { EvolutionPoint, MetricTrajectory } from '../types/index.ts';
import { calculateAcceleration, calculateSlope, determineTrend } from '../utils/index.ts';

export interface SemanticTrajectoryResult {
  semanticTrajectory: MetricTrajectory;
  semanticVelocity: number;
  semanticAcceleration: number;
}

export function analyzeSemanticTrajectory(points: EvolutionPoint[]): SemanticTrajectoryResult {
  const semanticPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.semanticScore }));
  return {
    semanticTrajectory: {
      metricName: 'semantic',
      points: semanticPoints,
      slope: calculateSlope(semanticPoints),
      acceleration: calculateAcceleration(semanticPoints),
      volatility: 0,
      trend: determineTrend(semanticPoints),
    },
    semanticVelocity: calculateSlope(semanticPoints),
    semanticAcceleration: calculateAcceleration(semanticPoints),
  };
}
