import type { EvolutionPoint } from '../types/index.ts';
import { calculateSlope } from '../utils/index.ts';

export interface DriftComparisonResult {
  semanticDriftVelocity: number;
  dependencyDriftVelocity: number;
  architectureDriftVelocity: number;
  dominantDrift: 'semantic' | 'dependency' | 'architecture' | 'none';
}

export function compareDrifts(points: EvolutionPoint[]): DriftComparisonResult {
  const semanticPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.semanticScore }));
  const depPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.coupling }));
  const archPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.driftScore }));

  const semanticVelocity = calculateSlope(semanticPoints);
  const dependencyVelocity = calculateSlope(depPoints);
  const architectureVelocity = calculateSlope(archPoints);

  const velocities = [
    { name: 'semantic' as const, v: Math.abs(semanticVelocity) },
    { name: 'dependency' as const, v: Math.abs(dependencyVelocity) },
    { name: 'architecture' as const, v: Math.abs(architectureVelocity) },
  ];
  const maxVel = Math.max(...velocities.map((x) => x.v));
  const dominant = maxVel < 0.001 ? 'none' : velocities.find((x) => x.v === maxVel)!.name;

  return {
    semanticDriftVelocity: semanticVelocity,
    dependencyDriftVelocity: dependencyVelocity,
    architectureDriftVelocity: architectureVelocity,
    dominantDrift: dominant,
  };
}
