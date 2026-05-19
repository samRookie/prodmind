import { describe, it, expect } from 'vitest';
import { createValidationContext } from '../../validation/validation-types.ts';
import { validateDependencyStructure, validateBrokenDependencyTargets, validateCircularDependencies, validateAliasResolutionIntegrity } from '../../validation/dependency-validation.ts';

function makeNode(id: string, filePath = `src/${id}.ts`) {
  return { id, filePath, fileHash: null, nodeType: 'FILE' as const, symbolName: null, language: 'ts', metadataJson: null };
}

function makeEdge(id: string, source: string, target: string, edgeType = 'IMPORTS') {
  return { id, sourceNodeId: source, targetNodeId: target, edgeType, weight: 1, metadataJson: null };
}

describe('dependency-validation', () => {
  it('validateBrokenDependencyTargets detects broken targets', () => {
    const ctx = createValidationContext({
      snapshotId: 's1', nodes: [makeNode('n1')], edges: [makeEdge('e1', 'n1', 'missing')],
    });
    const issues = validateBrokenDependencyTargets(ctx);
    expect(issues.some((i) => i.issueCode === 'BROKEN_DEP_TARGET')).toBe(true);
  });

  it('validateCircularDependencies detects circular chains', () => {
    const ctx = createValidationContext({
      snapshotId: 's1',
      nodes: [makeNode('a'), makeNode('b'), makeNode('c')],
      edges: [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'b', 'c'), makeEdge('e3', 'c', 'a')],
    });
    const issues = validateCircularDependencies(ctx);
    expect(issues.some((i) => i.issueCode === 'CIRCULAR_DEPENDENCY')).toBe(true);
  });

  it('validateAliasResolutionIntegrity detects broken aliases', () => {
    const ctx = createValidationContext({
      snapshotId: 's1',
      nodes: [makeNode('n1')],
      edges: [makeEdge('e1', 'n1', 'missing', 'ALIAS')],
    });
    const issues = validateAliasResolutionIntegrity(ctx);
    expect(issues.some((i) => i.issueCode === 'BROKEN_ALIAS_TARGET')).toBe(true);
  });

  it('validateDependencyStructure produces deterministic output', () => {
    const ctx = createValidationContext({
      snapshotId: 's1',
      nodes: [makeNode('a'), makeNode('b'), makeNode('c')],
      edges: [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'b', 'c'), makeEdge('e3', 'c', 'a')],
    });
    const run1 = validateDependencyStructure(ctx);
    const run2 = validateDependencyStructure(ctx);
    expect(run1.map((i) => i.issueCode)).toEqual(run2.map((i) => i.issueCode));
  });
});
