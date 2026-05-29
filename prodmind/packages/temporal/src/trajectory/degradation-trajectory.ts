import type { EvolutionPoint } from '../types/index.ts';
import { calculateAcceleration,calculateSlope } from '../utils/index.ts';

export interface DegradationTrajectoryResult {
  velocity: number;
  acceleration: number;
  estimatedTimeToCritical: number | null;
}

export function analyzeDegradationTrajectory(points: EvolutionPoint[]): DegradationTrajectoryResult {
  if (points.length < 2) {
    return { velocity: 0, acceleration: 0, estimatedTimeToCritical: null };
  }
  const driftPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.driftScore }));
  const velocity = calculateSlope(driftPoints);
  const acceleration = calculateAcceleration(driftPoints);
  const lastDrift = driftPoints[driftPoints.length - 1]!.value;
  const criticalThreshold = 0.8;
  let estimatedTimeToCritical: number | null = null;
  if (velocity > 0 && lastDrift < criticalThreshold) {
    const remaining = criticalThreshold - lastDrift;
    const dt = remaining / velocity;
    if (isFinite(dt) && dt > 0) {
      estimatedTimeToCritical = dt;
    }
  }
  return { velocity, acceleration, estimatedTimeToCritical };
}
