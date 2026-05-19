import { describe, it, expect } from 'vitest';
import { SemanticType } from '@prodmind/contracts';
import { createValidationContext } from '../../validation/validation-types.ts';
import { validateSemanticStructure, validateSemanticClassification, validateBoundaryConsistency, validateSemanticIsolation } from '../../validation/semantic-validation.ts';

function makeNode(id: string, filePath = `src/${id}.ts`) {
  return { id, filePath, fileHash: null, nodeType: 'FILE' as const, symbolName: null, language: 'ts', metadataJson: null };
}

function makeEdge(id: string, source: string, target: string) {
  return { id, sourceNodeId: source, targetNodeId: target, edgeType: 'IMPORTS', weight: 1, metadataJson: null };
}

describe('semantic-validation', () => {
  it('validateSemanticClassification warns on missing classifications', () => {
    const ctx = createValidationContext({
      snapshotId: 's1', nodes: [makeNode('n1')], edges: [],
    });
    const issues = validateSemanticClassification(ctx);
    expect(issues.some((i) => i.issueCode === 'MISSING_CLASSIFICATION')).toBe(true);
  });

  it('validateBoundaryConsistency detects infra in /business/ path', () => {
    const ctx = createValidationContext({
      snapshotId: 's1',
      nodes: [makeNode('n1', 'src/business/file.ts')],
      edges: [],
      classifications: [{ nodeId: 'n1', filePath: 'src/business/file.ts', semanticType: SemanticType.INFRASTRUCTURE, ruleStrength: 'HIGH' as any, classificationReasons: [], matchedHeuristics: [] }],
    });
    const issues = validateBoundaryConsistency(ctx);
    expect(issues.some((i) => i.issueCode === 'BOUNDARY_MISMATCH')).toBe(true);
  });

  it('validateSemanticIsolation warns on infra->domain edges', () => {
    const ctx = createValidationContext({
      snapshotId: 's1',
      nodes: [makeNode('n1'), makeNode('n2')],
      edges: [makeEdge('e1', 'n1', 'n2')],
      classifications: [
        { nodeId: 'n1', filePath: 'src/infra.ts', semanticType: SemanticType.INFRASTRUCTURE, ruleStrength: 'HIGH' as any, classificationReasons: [], matchedHeuristics: [] },
        { nodeId: 'n2', filePath: 'src/domain.ts', semanticType: SemanticType.DOMAIN_LAYER, ruleStrength: 'HIGH' as any, classificationReasons: [], matchedHeuristics: [] },
      ],
    });
    const issues = validateSemanticIsolation(ctx);
    expect(issues.some((i) => i.issueCode === 'INFRA_TO_BUSINESS_EDGE')).toBe(true);
  });

  it('validateSemanticStructure produces deterministic issues', () => {
    const ctx = createValidationContext({
      snapshotId: 's1', nodes: [makeNode('n1')], edges: [],
    });
    const run1 = validateSemanticStructure(ctx);
    const run2 = validateSemanticStructure(ctx);
    expect(run1.map((i) => i.issueCode)).toEqual(run2.map((i) => i.issueCode));
  });
});
