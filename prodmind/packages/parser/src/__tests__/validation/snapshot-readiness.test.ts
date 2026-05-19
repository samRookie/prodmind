import { describe, it, expect } from 'vitest';
import { ValidationSeverity, ValidationState, ValidationCategory } from '@prodmind/contracts';
import { createValidationContext } from '../../validation/validation-types.ts';
import { validateSnapshotReadiness, computeReadinessScore, determineValidationState } from '../../validation/snapshot-readiness.ts';
import type { ValidationIssue } from '../../validation/validation-types.ts';

function makeNode(id: string, filePath = `src/${id}.ts`) {
  return { id, filePath, fileHash: null, nodeType: 'FILE' as const, symbolName: null, language: 'ts', metadataJson: null };
}

function makeIssue(severity: ValidationSeverity): ValidationIssue {
  return { issueCode: 'TEST', severity, category: ValidationCategory.GRAPH_STRUCTURE, message: 'test', nodeId: null, edgeId: null, metadataJson: null };
}

describe('snapshot-readiness', () => {
  it('computeReadinessScore returns 1 for no issues', () => {
    expect(computeReadinessScore([])).toBe(1);
  });

  it('computeReadinessScore decreases with critical issues', () => {
    const score = computeReadinessScore([makeIssue(ValidationSeverity.CRITICAL)]);
    expect(score).toBeLessThan(1);
  });

  it('determineValidationState returns VALID for no issues', () => {
    expect(determineValidationState([])).toBe(ValidationState.VALID);
  });

  it('determineValidationState returns INVALID for critical issues', () => {
    const state = determineValidationState([makeIssue(ValidationSeverity.CRITICAL)]);
    expect(state).toBe(ValidationState.INVALID);
  });

  it('determineValidationState returns DEGRADED for warnings', () => {
    const state = determineValidationState([makeIssue(ValidationSeverity.WARNING)]);
    expect(state).toBe(ValidationState.DEGRADED);
  });

  it('validateSnapshotReadiness on empty graph', () => {
    const ctx = createValidationContext({ snapshotId: 's1', nodes: [], edges: [] });
    const result = validateSnapshotReadiness(ctx, []);
    expect(result.isReady).toBe(false);
  });

  it('validateSnapshotReadiness on valid graph', () => {
    const ctx = createValidationContext({
      snapshotId: 's1',
      nodes: [makeNode('n1'), makeNode('n2')],
      edges: [{ id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', edgeType: 'IMPORTS', weight: 1, metadataJson: null }],
    });
    const result = validateSnapshotReadiness(ctx, []);
    expect(result.isReady).toBe(true);
  });
});
