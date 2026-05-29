import type { EvolutionPoint } from '../types/index.ts';

export interface DependencyEvolutionResult {
  growthRate: number;
  acceleration: number;
  currentDensity: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
}

export function analyzeDependencyEvolution(points: EvolutionPoint[]): DependencyEvolutionResult {
  if (points.length < 2) {
    return { growthRate: 0, acceleration: 0, currentDensity: 0, trend: 'stable' };
  }
  const growthRate = points.length >= 2
    ? (points[points.length - 1]!.edgeCount - points[0]!.edgeCount) / points.length
    : 0;
  return {
    growthRate,
    acceleration: 0,
    currentDensity: points[points.length - 1]!.edgeCount / Math.max(1, points[points.length - 1]!.nodeCount),
    trend: growthRate > 0 ? 'increasing' : growthRate < 0 ? 'decreasing' : 'stable',
  };
}
