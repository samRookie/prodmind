import type { TemporalEvidence } from '../types/index.ts';

export function createTemporalEvidence(
  type: string,
  description: string,
  snapshotIds: string[],
  metricValues: Record<string, number>,
  trajectorySlope: number,
  confidence: number,
): TemporalEvidence {
  return {
    type,
    description,
    snapshotIds,
    metricValues,
    trajectorySlope,
    confidence: Math.max(0, Math.min(1, confidence)),
  };
}

export function mergeEvidence(
  evidenceList: TemporalEvidence[],
): TemporalEvidence {
  const allSnapshotIds = [...new Set(evidenceList.flatMap((e) => e.snapshotIds))];
  const mergedMetrics: Record<string, number> = {};
  for (const e of evidenceList) {
    Object.assign(mergedMetrics, e.metricValues);
  }
  const avgConfidence = evidenceList.reduce((s, e) => s + e.confidence, 0) / evidenceList.length;
  return {
    type: 'merged',
    description: `Merged from ${evidenceList.length} evidence sources`,
    snapshotIds: allSnapshotIds,
    metricValues: mergedMetrics,
    trajectorySlope: evidenceList.reduce((s, e) => s + e.trajectorySlope, 0) / evidenceList.length,
    confidence: avgConfidence,
  };
}
