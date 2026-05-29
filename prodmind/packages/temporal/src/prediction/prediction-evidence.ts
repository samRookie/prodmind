import type { BoundedPrediction, TemporalEvidence } from '../types/index.ts';

export function evaluatePredictionEvidence(
  prediction: BoundedPrediction,
  evidence: TemporalEvidence[],
): { supported: boolean; matchCount: number; totalConfidence: number } {
  const relevant = evidence.filter((e) =>
    Object.keys(e.metricValues).includes(prediction.metricName),
  );
  const totalConfidence = relevant.reduce((s, e) => s + e.confidence, 0);
  const matchCount = relevant.length;
  return {
    supported: matchCount > 0 && totalConfidence / Math.max(1, matchCount) >= 0.5,
    matchCount,
    totalConfidence,
  };
}
