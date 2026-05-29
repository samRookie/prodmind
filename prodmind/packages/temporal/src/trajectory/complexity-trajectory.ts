import { analyzeComplexityEvolution } from '../evolution/complexity-evolution.ts';
import type { EvolutionPoint, MetricTrajectory } from '../types/index.ts';

export function analyzeComplexityTrajectory(points: EvolutionPoint[]): MetricTrajectory {
  return analyzeComplexityEvolution(points);
}

export function computeComplexityAcceleration(complexityTrajectory: MetricTrajectory): number {
  if (complexityTrajectory.points.length < 3) return 0;
  return complexityTrajectory.acceleration;
}
