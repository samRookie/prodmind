import type { EvolutionPoint } from '../types/index.ts';
import { calculateAcceleration,calculateSlope } from '../utils/index.ts';

export interface ErosionResult {
  erosionScore: number;
  semanticErosionRate: number;
  structuralErosionRate: number;
  erosionTrend: 'accelerating' | 'stable' | 'decelerating';
}

export function analyzeErosion(points: EvolutionPoint[]): ErosionResult {
  const semanticPoints = points.map((p) => ({ timestamp: p.timestamp, value: 1 - p.semanticScore }));
  const driftPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.driftScore }));
  const semanticSlope = calculateSlope(semanticPoints);
  const driftSlope = calculateSlope(driftPoints);
  const driftAccel = calculateAcceleration(driftPoints);
  const erosionScore = points.length > 0
    ? (driftPoints[driftPoints.length - 1]!.value + (1 - points[points.length - 1]!.semanticScore)) / 2
    : 0;
  return {
    erosionScore,
    semanticErosionRate: semanticSlope,
    structuralErosionRate: driftSlope,
    erosionTrend: driftAccel > 0.001 ? 'accelerating' : driftAccel < -0.001 ? 'decelerating' : 'stable',
  };
}
