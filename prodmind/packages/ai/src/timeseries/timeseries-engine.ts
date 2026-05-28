import type { TimeseriesInput, TimeseriesOutput, ArchitectureTrend } from './timeseries-types.ts';
import { detectTrends } from './trend-detectors.ts';
import { detectCognitionTrends } from './cognition-timeseries.ts';
import { detectRiskTrends } from './risk-timeseries.ts';
import { detectPropagationTrends } from './propagation-timeseries.ts';
import { detectComplexityTrends } from './complexity-timeseries.ts';
import { detectStabilityTrends } from './stability-timeseries.ts';

export class TimeseriesEngine {
  analyze(input: TimeseriesInput): TimeseriesOutput {
    const allTrends: ArchitectureTrend[] = [
      ...detectTrends(input),
      ...detectCognitionTrends(input),
      ...detectRiskTrends(input),
      ...detectPropagationTrends(input),
      ...detectComplexityTrends(input),
      ...detectStabilityTrends(input),
    ];

    const sorted = [...allTrends].sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));

    return {
      snapshotId: input.snapshotId,
      trends: sorted,
      generatedAt: new Date().toISOString(),
    };
  }
}
