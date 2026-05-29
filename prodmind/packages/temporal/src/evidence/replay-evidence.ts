import type { TemporalEvidence } from '../types/index.ts';
import { createTemporalEvidence } from './temporal-evidence.ts';

export interface ReplayEvidenceInput {
  replaySessionId: string;
  divergenceScore: number;
  determinismScore: number;
  snapshotIds: string[];
  metricValues: Record<string, number>;
}

export function buildReplayEvidence(input: ReplayEvidenceInput): TemporalEvidence {
  return createTemporalEvidence(
    'replay',
    `Replay ${input.replaySessionId}: divergence=${input.divergenceScore.toFixed(3)}, determinism=${input.determinismScore.toFixed(3)}`,
    input.snapshotIds,
    input.metricValues,
    input.divergenceScore,
    input.determinismScore,
  );
}
