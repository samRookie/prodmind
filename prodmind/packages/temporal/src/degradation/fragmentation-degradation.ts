import type { EvolutionPoint } from '../types/index.ts';
import { calculateSlope } from '../utils/index.ts';

export interface FragmentationResult {
  fragmentationScore: number;
  fragmentationRate: number;
  isFragmented: boolean;
}

export function analyzeFragmentation(points: EvolutionPoint[]): FragmentationResult {
  const couplingPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.coupling }));
  const fragmentationScore = points.length > 0
    ? couplingPoints[couplingPoints.length - 1]!.value
    : 0;
  return {
    fragmentationScore,
    fragmentationRate: calculateSlope(couplingPoints),
    isFragmented: fragmentationScore > 0.5,
  };
}
