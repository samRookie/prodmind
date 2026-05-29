import type { EvolutionPoint } from '../types/index.ts';
import { calculateAcceleration, calculateSlope, determineTrend } from '../utils/index.ts';

export interface InstabilityGrowthResult {
  hasInstabilityGrowth: boolean;
  instabilityRate: number;
  instabilityAcceleration: number;
  instabilityTrend: string;
}

export function analyzeInstabilityGrowth(points: EvolutionPoint[]): InstabilityGrowthResult {
  if (points.length < 2) {
    return { hasInstabilityGrowth: false, instabilityRate: 0, instabilityAcceleration: 0, instabilityTrend: 'insufficient_data' };
  }
  const instPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.instability }));
  const slope = calculateSlope(instPoints);
  const accel = calculateAcceleration(instPoints);
  const trend = determineTrend(instPoints);
  return {
    hasInstabilityGrowth: slope > 0,
    instabilityRate: slope,
    instabilityAcceleration: accel,
    instabilityTrend: trend,
  };
}
