import type { EvolutionPoint } from '../types/index.ts';
import { calculateAcceleration,calculateSlope } from '../utils/index.ts';

export interface FatigueResult {
  fatigueScore: number;
  fatigueVelocity: number;
  fatigueAcceleration: number;
  estimatedCollapseCycles: number | null;
}

export function analyzeArchitecturalFatigue(points: EvolutionPoint[]): FatigueResult {
  const complexityPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.complexity }));
  const velocity = calculateSlope(complexityPoints);
  const acceleration = calculateAcceleration(complexityPoints);
  const currentComplexity = points.length > 0
    ? points[points.length - 1]!.complexity
    : 0;
  return {
    fatigueScore: currentComplexity / Math.max(1, points[0]?.complexity ?? 1),
    fatigueVelocity: velocity,
    fatigueAcceleration: acceleration,
    estimatedCollapseCycles: velocity > 0 && acceleration > 0
      ? Math.ceil((100 - currentComplexity) / velocity)
      : null,
  };
}
