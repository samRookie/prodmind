import { describe, it, expect } from 'vitest';
import { detectSccChanges, detectRiskChanges, detectHotspotChanges, detectPropagationChanges } from '../../diff/cognition-diff.ts';
import type { DiffInput } from '../../diff/diff-types.ts';

describe('CognitionDiff', () => {
  it('detects SCC expansion', () => {
    const input: DiffInput = {
      previousSnapshotId: 'p', currentSnapshotId: 'c',
      previousSccData: { componentCount: 1, componentNodes: new Map([[1, ['a']]]) },
      currentSccData: { componentCount: 1, componentNodes: new Map([[1, ['a', 'b', 'c']]]) },
    };
    const diffs = detectSccChanges(input);
    expect(diffs.some(d => d.diffType === 'SCC_EXPANDED')).toBe(true);
  });

  it('detects SCC reduction', () => {
    const input: DiffInput = {
      previousSnapshotId: 'p', currentSnapshotId: 'c',
      previousSccData: { componentCount: 1, componentNodes: new Map([[1, ['a', 'b', 'c']]]) },
      currentSccData: { componentCount: 1, componentNodes: new Map([[1, ['a']]]) },
    };
    const diffs = detectSccChanges(input);
    expect(diffs.some(d => d.diffType === 'SCC_REDUCED')).toBe(true);
  });

  it('detects risk increase', () => {
    const input: DiffInput = {
      previousSnapshotId: 'p', currentSnapshotId: 'c',
      previousRisks: [{ riskType: 'STABILITY_RISK', severity: 'HIGH', normalizedScore: 0.5, impactedNodes: ['n1'] }],
      currentRisks: [{ riskType: 'STABILITY_RISK', severity: 'CRITICAL', normalizedScore: 0.9, impactedNodes: ['n1'] }],
    };
    const diffs = detectRiskChanges(input);
    expect(diffs.some(d => d.diffType === 'RISK_INCREASED')).toBe(true);
  });

  it('detects hotspot emergence', () => {
    const input: DiffInput = {
      previousSnapshotId: 'p', currentSnapshotId: 'c',
      previousHotspots: [{ nodeId: 'n1', severity: 'HIGH' }],
      currentHotspots: [{ nodeId: 'n1', severity: 'HIGH' }, { nodeId: 'n2', severity: 'CRITICAL' }],
    };
    const diffs = detectHotspotChanges(input);
    expect(diffs.some(d => d.diffType === 'HOTSPOT_EMERGED')).toBe(true);
  });

  it('detects propagation expansion', () => {
    const input: DiffInput = {
      previousSnapshotId: 'p', currentSnapshotId: 'c',
      previousPropagation: [{ nodeId: 'n1', propagationPressure: 0.3 }],
      currentPropagation: [{ nodeId: 'n1', propagationPressure: 0.8 }],
    };
    const diffs = detectPropagationChanges(input);
    expect(diffs.some(d => d.diffType === 'PROPAGATION_EXPANDED')).toBe(true);
  });
});
