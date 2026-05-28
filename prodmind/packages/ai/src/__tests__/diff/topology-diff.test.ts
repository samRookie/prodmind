import { describe, it, expect } from 'vitest';
import { detectTopologyChanges, detectPropagationExpansion } from '../../diff/topology-diff.ts';
import type { DiffInput } from '../../diff/diff-types.ts';

describe('TopologyDiff', () => {
  it('detects topology changes combining node, edge, scc diffs', () => {
    const input: DiffInput = {
      previousSnapshotId: 'p', currentSnapshotId: 'c',
      previousNodes: [{ id: 'a' }], currentNodes: [{ id: 'a' }, { id: 'b' }],
      previousSccData: { componentCount: 0, componentNodes: new Map() },
      currentSccData: { componentCount: 1, componentNodes: new Map([[1, ['a', 'b']]]) },
    };
    const diffs = detectTopologyChanges(input);
    expect(diffs.length).toBeGreaterThanOrEqual(2);
  });

  it('detects propagation expansion from topology perspective', () => {
    const input: DiffInput = {
      previousSnapshotId: 'p', currentSnapshotId: 'c',
      previousPropagation: [{ nodeId: 'n1', propagationPressure: 0.3 }],
      currentPropagation: [{ nodeId: 'n1', propagationPressure: 0.9 }, { nodeId: 'n2', propagationPressure: 0.8 }],
    };
    const diffs = detectPropagationExpansion(input);
    expect(diffs.length).toBeGreaterThan(0);
  });
});
