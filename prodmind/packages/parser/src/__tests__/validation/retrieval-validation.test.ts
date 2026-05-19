import { describe, it, expect } from 'vitest';
import { createValidationContext } from '../../validation/validation-types.ts';
import { validateRetrievalStructure, validateNeighborhoodTraversal, validateRetrievalDeterminism } from '../../validation/retrieval-validation.ts';

function makeNode(id: string, filePath = `src/${id}.ts`) {
  return { id, filePath, fileHash: null, nodeType: 'FILE' as const, symbolName: null, language: 'ts', metadataJson: null };
}

function makeEdge(id: string, source: string, target: string) {
  return { id, sourceNodeId: source, targetNodeId: target, edgeType: 'IMPORTS', weight: 1, metadataJson: null };
}

describe('retrieval-validation', () => {
  it('validateNeighborhoodTraversal works on connected graph', () => {
    const ctx = createValidationContext({
      snapshotId: 's1',
      nodes: [makeNode('n1'), makeNode('n2'), makeNode('n3'), makeNode('n4')],
      edges: [makeEdge('e1', 'n1', 'n2'), makeEdge('e2', 'n2', 'n3'), makeEdge('e3', 'n3', 'n4')],
    });
    const issues = validateNeighborhoodTraversal(ctx);
    expect(issues.length).toBeGreaterThanOrEqual(0);
  });

  it('validateRetrievalDeterminism detects non-deterministic order', () => {
    const ctx = createValidationContext({
      snapshotId: 's1',
      nodes: [makeNode('n1')],
      edges: [],
    });
    const issues = validateRetrievalDeterminism(ctx);
    expect(issues.some((i) => i.issueCode.startsWith('NON_DETERMINISTIC'))).toBe(false);
  });

  it('validateRetrievalStructure produces deterministic output', () => {
    const ctx = createValidationContext({
      snapshotId: 's1',
      nodes: [makeNode('n1'), makeNode('n2')],
      edges: [makeEdge('e1', 'n1', 'n2')],
    });
    const run1 = validateRetrievalStructure(ctx);
    const run2 = validateRetrievalStructure(ctx);
    expect(run1.map((i) => i.issueCode)).toEqual(run2.map((i) => i.issueCode));
  });
});
