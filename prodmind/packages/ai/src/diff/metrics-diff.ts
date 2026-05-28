import type { ArchitectureDiff, DiffInput } from './diff-types.ts';
import { buildDiff } from './diff-engine.ts';

export function detectComplexityChanges(input: DiffInput): ArchitectureDiff[] {
  const diffs: ArchitectureDiff[] = [];
  const prev = input.previousComplexity;
  const curr = input.currentComplexity;
  if (!prev || !curr) return diffs;

  const delta = curr.finalScore - prev.finalScore;
  if (Math.abs(delta) >= 0.05) {
    const isIncrease = delta > 0;
    diffs.push(buildDiff({
      diffType: isIncrease ? 'COMPLEXITY_INCREASED' : 'COMPLEXITY_REDUCED',
      severity: Math.abs(delta) >= 0.2 ? 'CRITICAL' : Math.abs(delta) >= 0.1 ? 'HIGH' : 'MODERATE',
      previousSnapshotId: input.previousSnapshotId, currentSnapshotId: input.currentSnapshotId,
      impactedNodes: [],
      evidence: [{ metricType: 'COMPLEXITY_SCORE', previousValue: prev.finalScore, currentValue: curr.finalScore, delta: Math.round(delta * 1000) / 1000, description: `Complexity ${isIncrease ? 'increased' : 'decreased'} from ${(prev.finalScore * 100).toFixed(0)} to ${(curr.finalScore * 100).toFixed(0)}` }],
      metadata: { previousScore: prev.finalScore, currentScore: curr.finalScore, delta },
    }));
  }

  const fragDelta = curr.fragmentationScore - prev.fragmentationScore;
  if (fragDelta >= 0.1) {
    diffs.push(buildDiff({
      diffType: 'ARCHITECTURE_FRAGMENTED', severity: fragDelta >= 0.2 ? 'CRITICAL' : 'HIGH',
      previousSnapshotId: input.previousSnapshotId, currentSnapshotId: input.currentSnapshotId,
      impactedNodes: [],
      evidence: [{ metricType: 'FRAGMENTATION_SCORE', previousValue: prev.fragmentationScore, currentValue: curr.fragmentationScore, delta: Math.round(fragDelta * 1000) / 1000, description: `Fragmentation increased from ${(prev.fragmentationScore * 100).toFixed(0)} to ${(curr.fragmentationScore * 100).toFixed(0)}` }],
      metadata: { previousFragmentation: prev.fragmentationScore, currentFragmentation: curr.fragmentationScore },
    }));
  }
  return diffs;
}

export function detectHealthChanges(input: DiffInput): ArchitectureDiff[] {
  const diffs: ArchitectureDiff[] = [];
  if (input.previousHealthScore === undefined || input.currentHealthScore === undefined) return diffs;
  const delta = input.currentHealthScore - input.previousHealthScore;
  if (Math.abs(delta) >= 0.05) {
    const improved = delta > 0;
    diffs.push(buildDiff({
      diffType: improved ? 'HEALTH_IMPROVED' : 'HEALTH_DEGRADED',
      severity: Math.abs(delta) >= 0.2 ? 'CRITICAL' : Math.abs(delta) >= 0.1 ? 'HIGH' : 'MODERATE',
      previousSnapshotId: input.previousSnapshotId, currentSnapshotId: input.currentSnapshotId,
      impactedNodes: [],
      evidence: [{ metricType: 'HEALTH_SCORE', previousValue: input.previousHealthScore, currentValue: input.currentHealthScore, delta: Math.round(delta * 1000) / 1000, description: `Health ${improved ? 'improved' : 'degraded'} from ${(input.previousHealthScore * 100).toFixed(0)} to ${(input.currentHealthScore * 100).toFixed(0)}` }],
      metadata: { previousHealth: input.previousHealthScore, currentHealth: input.currentHealthScore },
    }));
  }
  return diffs;
}
