import { describe, it, expect } from 'vitest';
import { detectNodeChanges, detectEdgeChanges } from '../../diff/graph-diff.ts';
import type { DiffInput } from '../../diff/diff-types.ts';

describe('GraphDiff', () => {
  it('detects added nodes', () => {
    const input: DiffInput = { previousSnapshotId: 'p', currentSnapshotId: 'c', previousNodes: [{ id: 'a' }], currentNodes: [{ id: 'a' }, { id: 'b' }] };
    const diffs = detectNodeChanges(input);
    expect(diffs.some(d => d.diffType === 'NODE_ADDED')).toBe(true);
  });

  it('detects removed nodes', () => {
    const input: DiffInput = { previousSnapshotId: 'p', currentSnapshotId: 'c', previousNodes: [{ id: 'a' }, { id: 'b' }], currentNodes: [{ id: 'a' }] };
    const diffs = detectNodeChanges(input);
    expect(diffs.some(d => d.diffType === 'NODE_REMOVED')).toBe(true);
  });

  it('detects added edges', () => {
    const input: DiffInput = { previousSnapshotId: 'p', currentSnapshotId: 'c', previousEdges: [{ id: 'e1', sourceNodeId: 'a', targetNodeId: 'b' }], currentEdges: [{ id: 'e1', sourceNodeId: 'a', targetNodeId: 'b' }, { id: 'e2', sourceNodeId: 'b', targetNodeId: 'c' }] };
    const diffs = detectEdgeChanges(input);
    expect(diffs.some(d => d.diffType === 'EDGE_ADDED')).toBe(true);
  });

  it('detects removed edges', () => {
    const input: DiffInput = { previousSnapshotId: 'p', currentSnapshotId: 'c', previousEdges: [{ id: 'e1', sourceNodeId: 'a', targetNodeId: 'b' }, { id: 'e2', sourceNodeId: 'b', targetNodeId: 'c' }], currentEdges: [{ id: 'e1', sourceNodeId: 'a', targetNodeId: 'b' }] };
    const diffs = detectEdgeChanges(input);
    expect(diffs.some(d => d.diffType === 'EDGE_REMOVED')).toBe(true);
  });

  it('returns empty for no changes', () => {
    const input: DiffInput = { previousSnapshotId: 'p', currentSnapshotId: 'c', previousNodes: [{ id: 'a' }], currentNodes: [{ id: 'a' }] };
    const diffs = detectNodeChanges(input);
    expect(diffs).toHaveLength(0);
  });
});
