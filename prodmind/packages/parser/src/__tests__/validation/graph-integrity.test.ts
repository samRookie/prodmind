import { describe, it, expect } from 'vitest';
import { createValidationContext } from '../../validation/validation-types.ts';
import { validateGraphStructure, validateNodeReferences, validateEdgeReferences, validateDuplicateEdges, validateOrphanNodes, validateBrokenRegions, validateCycleCorrectness, validateGraphConnectivity } from '../../validation/graph-integrity.ts';

function makeNode(id: string, filePath = `src/${id}.ts`) {
  return { id, filePath, fileHash: null, nodeType: 'FILE' as const, symbolName: null, language: 'ts', metadataJson: null };
}

function makeEdge(id: string, source: string, target: string, edgeType = 'IMPORTS') {
  return { id, sourceNodeId: source, targetNodeId: target, edgeType, weight: 1, metadataJson: null };
}

describe('graph-integrity', () => {
  it('validateNodeReferences detects missing source', () => {
    const ctx = createValidationContext({
      snapshotId: 's1', nodes: [makeNode('n1')], edges: [makeEdge('e1', 'n1', 'missing')],
    });
    const issues = validateNodeReferences(ctx);
    expect(issues.some((i) => i.issueCode === 'NODE_REF_MISSING_TARGET')).toBe(true);
  });

  it('validateNodeReferences detects missing target', () => {
    const ctx = createValidationContext({
      snapshotId: 's1', nodes: [makeNode('n1')], edges: [makeEdge('e1', 'missing', 'n1')],
    });
    const issues = validateNodeReferences(ctx);
    expect(issues.some((i) => i.issueCode === 'NODE_REF_MISSING_SOURCE')).toBe(true);
  });

  it('validateEdgeReferences detects self-referencing edges', () => {
    const ctx = createValidationContext({
      snapshotId: 's1', nodes: [makeNode('n1')], edges: [makeEdge('e1', 'n1', 'n1')],
    });
    const issues = validateEdgeReferences(ctx);
    expect(issues.some((i) => i.issueCode === 'EDGE_SELF_REFERENCE')).toBe(true);
  });

  it('validateDuplicateEdges detects duplicates', () => {
    const ctx = createValidationContext({
      snapshotId: 's1',
      nodes: [makeNode('n1'), makeNode('n2')],
      edges: [makeEdge('e1', 'n1', 'n2'), makeEdge('e2', 'n1', 'n2')],
    });
    const issues = validateDuplicateEdges(ctx);
    expect(issues.some((i) => i.issueCode === 'DUPLICATE_EDGE')).toBe(true);
  });

  it('validateOrphanNodes detects isolated nodes', () => {
    const ctx = createValidationContext({
      snapshotId: 's1',
      nodes: [makeNode('n1'), makeNode('n2')],
      edges: [],
    });
    const issues = validateOrphanNodes(ctx);
    expect(issues.some((i) => i.issueCode === 'ORPHAN_NODE')).toBe(true);
  });

  it('validateCycleCorrectness detects cycles', () => {
    const ctx = createValidationContext({
      snapshotId: 's1',
      nodes: [makeNode('a'), makeNode('b'), makeNode('c')],
      edges: [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'b', 'c'), makeEdge('e3', 'c', 'a')],
    });
    const issues = validateCycleCorrectness(ctx);
    expect(issues.some((i) => i.issueCode === 'CYCLE_DETECTED')).toBe(true);
  });

  it('validateBrokenRegions detects disconnected components', () => {
    const ctx = createValidationContext({
      snapshotId: 's1',
      nodes: [makeNode('a'), makeNode('b')],
      edges: [],
    });
    const issues = validateBrokenRegions(ctx);
    expect(issues.some((i) => i.issueCode === 'DISCONNECTED_REGIONS')).toBe(true);
  });

  it('validateGraphConnectivity warns on unreachable nodes', () => {
    const ctx = createValidationContext({
      snapshotId: 's1',
      nodes: [makeNode('a'), makeNode('b')],
      edges: [],
    });
    const issues = validateGraphConnectivity(ctx);
    expect(issues.some((i) => i.issueCode === 'GRAPH_NOT_FULLY_CONNECTED')).toBe(true);
  });

  it('validateGraphStructure produces stable issue ordering', () => {
    const ctx = createValidationContext({
      snapshotId: 's1',
      nodes: [makeNode('a'), makeNode('b')],
      edges: [makeEdge('e1', 'a', 'missing')],
    });
    const result1 = validateGraphStructure(ctx);
    const result2 = validateGraphStructure(ctx);
    expect(result1.issues.map((i) => i.issueCode)).toEqual(result2.issues.map((i) => i.issueCode));
  });
});
