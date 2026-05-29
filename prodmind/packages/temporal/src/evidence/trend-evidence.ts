import type { TemporalEvidence } from '../types/index.ts';
import { createTemporalEvidence } from './temporal-evidence.ts';

export interface TrendEvidenceInput {
  trendType: string;
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  slope: number;
  magnitude: number;
  snapshotIds: string[];
  metricValues: Record<string, number>;
}

export function buildTrendEvidence(input: TrendEvidenceInput): TemporalEvidence {
  return createTemporalEvidence(
    `trend_${input.trendType}`,
    `${input.trendType} trend is ${input.direction} (slope: ${input.slope.toFixed(4)}, magnitude: ${input.magnitude.toFixed(4)})`,
    input.snapshotIds,
    input.metricValues,
    input.slope,
    Math.min(1, Math.abs(input.slope) * input.magnitude),
  );
}
