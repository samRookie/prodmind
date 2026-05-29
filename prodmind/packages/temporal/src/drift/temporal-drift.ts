import type { EvolutionPoint } from '../types/index.ts';
import { calculateAcceleration,calculateSlope } from '../utils/index.ts';

export interface TemporalDriftResult {
  totalDrift: number;
  driftVelocity: number;
  driftAcceleration: number;
  driftLevel: 'none' | 'low' | 'moderate' | 'high' | 'critical';
}

export function computeTemporalDrift(points: EvolutionPoint[]): TemporalDriftResult {
  if (points.length < 2) {
    return { totalDrift: 0, driftVelocity: 0, driftAcceleration: 0, driftLevel: 'none' };
  }
  const driftPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.driftScore }));
  const driftVelocity = calculateSlope(driftPoints);
  const driftAcceleration = calculateAcceleration(driftPoints);
  const totalDrift = driftPoints[driftPoints.length - 1]!.value - driftPoints[0]!.value;
  const level = totalDrift < 0.1 ? 'none' : totalDrift < 0.3 ? 'low' : totalDrift < 0.5 ? 'moderate' : totalDrift < 0.7 ? 'high' : 'critical';
  return { totalDrift, driftVelocity, driftAcceleration, driftLevel: level as TemporalDriftResult['driftLevel'] };
}
