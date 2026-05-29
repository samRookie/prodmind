import type { DegradationPoint,EvolutionPoint } from '../types/index.ts';
import { analyzeArchitecturalFatigue } from './architectural-fatigue.ts';
import { analyzeErosion } from './erosion-analysis.ts';
import { analyzeFragmentation } from './fragmentation-degradation.ts';

export interface DegradationAnalysisResult {
  erosion: ReturnType<typeof analyzeErosion>;
  fragmentation: ReturnType<typeof analyzeFragmentation>;
  fatigue: ReturnType<typeof analyzeArchitecturalFatigue>;
  overallDegradationScore: number;
  degradationLevel: 'none' | 'low' | 'moderate' | 'severe' | 'critical';
  degradationPoints: DegradationPoint[];
}

export class DegradationEngine {
  analyze(points: EvolutionPoint[]): DegradationAnalysisResult {
    const erosion = analyzeErosion(points);
    const fragmentation = analyzeFragmentation(points);
    const fatigue = analyzeArchitecturalFatigue(points);
    const overallDegradationScore = (erosion.erosionScore + fragmentation.fragmentationScore + fatigue.fatigueScore) / 3;
    const degradationLevel = overallDegradationScore < 0.2 ? 'none'
      : overallDegradationScore < 0.4 ? 'low'
      : overallDegradationScore < 0.6 ? 'moderate'
      : overallDegradationScore < 0.8 ? 'severe'
      : 'critical';
    const baseComplexity = points[0]?.complexity ?? 1;
    const degradationPoints: DegradationPoint[] = points.map((p) => ({
      snapshotId: p.snapshotId,
      timestamp: p.timestamp,
      erosionScore: p.driftScore,
      fragmentationScore: p.coupling,
      fatigueScore: p.complexity / Math.max(1, baseComplexity),
      instabilityAccumulation: p.instability,
      decayAcceleration: 0,
    }));
    return {
      erosion,
      fragmentation,
      fatigue,
      overallDegradationScore,
      degradationLevel,
      degradationPoints,
    };
  }
}
