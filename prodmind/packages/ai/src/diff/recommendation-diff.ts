import type { ArchitectureDiff, DiffInput } from './diff-types.ts';
import { buildDiff } from './diff-engine.ts';

export function detectRecommendationChurn(input: DiffInput): ArchitectureDiff[] {
  const diffs: ArchitectureDiff[] = [];
  const prevFps = new Set((input.previousRisks ?? []).map(r => `${r.riskType}-${r.severity}`));
  const currFps = new Set((input.currentRisks ?? []).map(r => `${r.riskType}-${r.severity}`));
  const newRecs = [...currFps].filter(r => !prevFps.has(r));
  if (newRecs.length > 0) {
    diffs.push(buildDiff({
      diffType: 'RISK_INCREASED', severity: 'MODERATE',
      previousSnapshotId: input.previousSnapshotId, currentSnapshotId: input.currentSnapshotId,
      impactedNodes: [],
      evidence: [{ metricType: 'NEW_RECOMMENDATIONS', previousValue: 0, currentValue: newRecs.length, delta: newRecs.length, description: `${newRecs.length} new risk categories identified` }],
      metadata: { newRiskCategories: newRecs },
    }));
  }
  return diffs;
}
