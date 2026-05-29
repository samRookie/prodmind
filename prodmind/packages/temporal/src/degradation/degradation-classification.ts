import type { EvolutionPoint } from '../types/index.ts';
import { analyzeArchitecturalFatigue } from './architectural-fatigue.ts';
import { analyzeErosion } from './erosion-analysis.ts';
import { analyzeFragmentation } from './fragmentation-degradation.ts';

export type DegradationClass =
  | 'healthy'
  | 'eroding'
  | 'fragmenting'
  | 'fatigued'
  | 'critically_degraded';

export interface DegradationClassificationResult {
  primaryClass: DegradationClass;
  secondaryClasses: DegradationClass[];
  scores: Record<DegradationClass, number>;
}

export function classifyDegradation(points: EvolutionPoint[]): DegradationClassificationResult {
  const erosion = analyzeErosion(points);
  const fragmentation = analyzeFragmentation(points);
  const fatigue = analyzeArchitecturalFatigue(points);

  const scores: Record<DegradationClass, number> = {
    healthy: 1 - (erosion.erosionScore + fragmentation.fragmentationScore + fatigue.fatigueScore) / 3,
    eroding: erosion.erosionScore,
    fragmenting: fragmentation.fragmentationScore,
    fatigued: fatigue.fatigueScore,
    critically_degraded: (erosion.erosionScore + fragmentation.fragmentationScore + fatigue.fatigueScore) / 3,
  };

  const entries = Object.entries(scores) as [DegradationClass, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  const primaryClass = sorted[0]![0];
  const secondaryClasses = sorted.slice(1, 3).map(([c]) => c);

  return { primaryClass, secondaryClasses, scores };
}
