import type { EvolutionPoint } from '../types/index.ts';
import { calculateAcceleration } from '../utils/index.ts';

export interface DriftAccelerationResult {
  acceleration: number;
  accelerationLevel: 'accelerating' | 'decelerating' | 'constant';
}

export function analyzeDriftAcceleration(points: EvolutionPoint[]): DriftAccelerationResult {
  if (points.length < 3) {
    return { acceleration: 0, accelerationLevel: 'constant' };
  }
  const driftPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.driftScore }));
  const accel = calculateAcceleration(driftPoints);
  return {
    acceleration: accel,
    accelerationLevel: accel > 0.001 ? 'accelerating' : accel < -0.001 ? 'decelerating' : 'constant',
  };
}
