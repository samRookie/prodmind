import { describe, it, expect } from 'vitest';
import type { SemanticType, RuleStrength } from '@prodmind/contracts';
import { createRetrievalCache } from '../../retrieval/retrieval-cache.ts';
import {
  retrieveArchitecturalSlice,
  retrieveInfrastructureSlice,
  retrieveBusinessDomainSlice,
} from '../../retrieval/architectural-slice.ts';
import type { ClassificationResult } from '../../semantic/types.ts';

function makeNode(id: string, filePath: string) {
  return { id, filePath, fileHash: null, nodeType: 'FILE', symbolName: null, language: 'ts', metadataJson: null };
}

function makeEdge(id: string, source: string, target: string) {
  return { id, sourceNodeId: source, targetNodeId: target, edgeType: 'IMPORTS', weight: 1, metadataJson: null };
}

function makeClassification(nodeId: string, semanticType: SemanticType): ClassificationResult {
  return {
    nodeId,
    filePath: `/src/${nodeId}.ts`,
    semanticType,
    ruleStrength: 'HIGH' as RuleStrength,
    classificationReasons: [],
    matchedHeuristics: [],
  };
}

describe('architectural-slice', () => {
  const nodes = [
    makeNode('infra1', 'src/config.ts'),
    makeNode('infra2', 'src/deploy.ts'),
    makeNode('domain1', 'src/domain/user.ts'),
    makeNode('service1', 'src/services/user.ts'),
    makeNode('other1', 'src/test/spec.ts'),
  ];
  const edges = [
    makeEdge('e1', 'infra1', 'infra2'),
    makeEdge('e2', 'domain1', 'service1'),
  ];
  const classifications: ClassificationResult[] = [
    makeClassification('infra1', 'INFRASTRUCTURE' as SemanticType),
    makeClassification('infra2', 'CONFIGURATION' as SemanticType),
    makeClassification('domain1', 'DOMAIN_LAYER' as SemanticType),
    makeClassification('service1', 'SERVICE_LAYER' as SemanticType),
    makeClassification('other1', 'TESTING' as SemanticType),
  ];

  const ctx = createRetrievalCache({ nodes, edges, classifications });

  it('retrieveInfrastructureSlice returns infra nodes', () => {
    const result = retrieveInfrastructureSlice(ctx);
    expect(result.nodes.length).toBeGreaterThanOrEqual(2);
    expect(result.nodes.some((n) => n.nodeId === 'infra1')).toBe(true);
    expect(result.nodes.some((n) => n.nodeId === 'infra2')).toBe(true);
  });

  it('retrieveBusinessDomainSlice returns business nodes', () => {
    const result = retrieveBusinessDomainSlice(ctx);
    expect(result.nodes.some((n) => n.nodeId === 'domain1')).toBe(true);
    expect(result.nodes.some((n) => n.nodeId === 'service1')).toBe(true);
  });

  it('retrieveArchitecturalSlice with specific types', () => {
    const result = retrieveArchitecturalSlice(ctx, ['TESTING' as SemanticType]);
    expect(result.nodes.some((n) => n.nodeId === 'other1')).toBe(true);
  });

  it('returns deterministic ordering', () => {
    const run1 = retrieveInfrastructureSlice(ctx);
    const run2 = retrieveInfrastructureSlice(ctx);
    expect(run1.nodes.map((n) => n.nodeId)).toEqual(run2.nodes.map((n) => n.nodeId));
  });

  it('handles empty types', () => {
    const result = retrieveArchitecturalSlice(ctx, []);
    expect(result.nodes).toHaveLength(0);
  });
});
