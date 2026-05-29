import type { TemporalEvidence } from '../types/index.ts';
import { createTemporalEvidence } from './temporal-evidence.ts';

export interface DegradationEvidenceInput {
  erosionScore: number;
  fragmentationScore: number;
  fatigueScore: number;
  snapshotIds: string[];
  trajectorySlope: number;
}

export function buildDegradationEvidence(input: DegradationEvidenceInput): TemporalEvidence {
  return createTemporalEvidence(
    'degradation',
    `Erosion: ${input.erosionScore.toFixed(3)}, Fragmentation: ${input.fragmentationScore.toFixed(3)}, Fatigue: ${input.fatigueScore.toFixed(3)}`,
    input.snapshotIds,
    {
      erosion: input.erosionScore,
      fragmentation: input.fragmentationScore,
      fatigue: input.fatigueScore,
    },
    input.trajectorySlope,
    Math.min(1, (input.erosionScore + input.fragmentationScore + input.fatigueScore) / 3),
  );
}
