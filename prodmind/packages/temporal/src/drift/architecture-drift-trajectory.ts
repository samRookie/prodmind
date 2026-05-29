import type { EvolutionPoint } from '../types/index.ts';
import { calculateAcceleration,calculateSlope } from '../utils/index.ts';

export interface ArchitectureDriftTrajectory {
  overallDriftVelocity: number;
  overallDriftAcceleration: number;
  direction: 'diverging' | 'converging' | 'stable';
}

export function analyzeArchitectureDriftTrajectory(points: EvolutionPoint[]): ArchitectureDriftTrajectory {
  if (points.length < 2) {
    return { overallDriftVelocity: 0, overallDriftAcceleration: 0, direction: 'stable' };
  }
  const driftPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.driftScore }));
  const velocity = calculateSlope(driftPoints);
  const acceleration = calculateAcceleration(driftPoints);
  return {
    overallDriftVelocity: velocity,
    overallDriftAcceleration: acceleration,
    direction: velocity > 0.01 ? 'diverging' : velocity < -0.01 ? 'converging' : 'stable',
  };
}
