import { describe, it, expect } from 'vitest';
import { DiffEngine } from '../../diff/diff-engine.ts';
import type { DiffInput } from '../../diff/diff-types.ts';

describe('DiffEngine', () => {
  it('detects node changes', () => {
    const input: DiffInput = {
      previousSnapshotId: 'prev', currentSnapshotId: 'curr',
      previousNodes: [{ id: 'a' }, { id: 'b' }],
      currentNodes: [{ id: 'a' }, { id: 'c' }],
    };
    const engine = new DiffEngine();
    const output = engine.compare(input);
    expect(output.diffs.some(d => d.diffType === 'NODE_ADDED')).toBe(true);
    expect(output.diffs.some(d => d.diffType === 'NODE_REMOVED')).toBe(true);
  });

  it('detects edge changes', () => {
    const input: DiffInput = {
      previousSnapshotId: 'prev', currentSnapshotId: 'curr',
      previousEdges: [{ id: 'e1', sourceNodeId: 'a', targetNodeId: 'b' }],
      currentEdges: [{ id: 'e1', sourceNodeId: 'a', targetNodeId: 'b' }, { id: 'e2', sourceNodeId: 'b', targetNodeId: 'c' }],
    };
    const engine = new DiffEngine();
    const output = engine.compare(input);
    expect(output.diffs.some(d => d.diffType === 'EDGE_ADDED')).toBe(true);
  });

  it('detects health changes', () => {
    const input: DiffInput = {
      previousSnapshotId: 'prev', currentSnapshotId: 'curr',
      previousHealthScore: 0.8, currentHealthScore: 0.5,
    };
    const engine = new DiffEngine();
    const output = engine.compare(input);
    expect(output.diffs.some(d => d.diffType === 'HEALTH_DEGRADED')).toBe(true);
  });

  it('detects complexity changes', () => {
    const input: DiffInput = {
      previousSnapshotId: 'prev', currentSnapshotId: 'curr',
      previousComplexity: { finalScore: 0.3, fragmentationScore: 0.1 },
      currentComplexity: { finalScore: 0.6, fragmentationScore: 0.3 },
    };
    const engine = new DiffEngine();
    const output = engine.compare(input);
    expect(output.diffs.some(d => d.diffType === 'COMPLEXITY_INCREASED')).toBe(true);
    expect(output.diffs.some(d => d.diffType === 'ARCHITECTURE_FRAGMENTED')).toBe(true);
  });

  it('detects risk changes', () => {
    const input: DiffInput = {
      previousSnapshotId: 'prev', currentSnapshotId: 'curr',
      previousRisks: [{ riskType: 'STABILITY_RISK', severity: 'HIGH', normalizedScore: 0.5, impactedNodes: ['n1'] }],
      currentRisks: [{ riskType: 'STABILITY_RISK', severity: 'CRITICAL', normalizedScore: 0.85, impactedNodes: ['n1'] }],
    };
    const engine = new DiffEngine();
    const output = engine.compare(input);
    expect(output.diffs.some(d => d.diffType === 'RISK_INCREASED')).toBe(true);
  });

  it('detects hotspot changes', () => {
    const input: DiffInput = {
      previousSnapshotId: 'prev', currentSnapshotId: 'curr',
      previousHotspots: [{ nodeId: 'n1', severity: 'HIGH' }],
      currentHotspots: [{ nodeId: 'n1', severity: 'HIGH' }, { nodeId: 'n2', severity: 'CRITICAL' }],
    };
    const engine = new DiffEngine();
    const output = engine.compare(input);
    expect(output.diffs.some(d => d.diffType === 'HOTSPOT_EMERGED')).toBe(true);
  });

  it('produces deterministic diff output', () => {
    const input: DiffInput = {
      previousSnapshotId: 'prev', currentSnapshotId: 'curr',
      previousNodes: [{ id: 'a' }], currentNodes: [{ id: 'a' }, { id: 'b' }],
    };
    const engine = new DiffEngine();
    const a = engine.compare(input);
    const b = engine.compare(input);
    expect(a.diffs.map(d => d.fingerprint)).toEqual(b.diffs.map(d => d.fingerprint));
  });

  it('handles empty diff input', () => {
    const input: DiffInput = { previousSnapshotId: 'prev', currentSnapshotId: 'curr' };
    const engine = new DiffEngine();
    const output = engine.compare(input);
    expect(output.diffs).toHaveLength(0);
  });
});
