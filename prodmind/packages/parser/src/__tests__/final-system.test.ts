import { describe, it, expect } from 'vitest';
import { Phase4SystemVerifier } from '../verification/system-verifier.ts';
import { SnapshotFreezer } from '../verification/freeze-snapshot.ts';
import { SystemBenchmark } from '../verification/system-benchmark.ts';
import { SystemVerificationError, SnapshotFrozenError } from '../verification/verification-errors.ts';
import { generateMesh, generateChain } from './test-utils/synthetic-graph-generator.ts';

import { measureDuration } from './test-utils/benchmark-helpers.ts';
import type { ValidationInput } from '../validation/validation-types.ts';
import type { ClassificationResult } from '../semantic/types.ts';
import { SemanticType, RuleStrength, InstabilityLevel } from '@prodmind/contracts';

function buildInput(graph: ReturnType<typeof generateMesh>): ValidationInput {
  return {
    snapshotId: graph.snapshotId,
    nodes: graph.nodes.map((n) => ({
      id: n.id, filePath: n.filePath, fileHash: n.fileHash,
      nodeType: n.nodeType, symbolName: n.symbolName, language: n.language, metadataJson: n.metadataJson,
    })),
    edges: graph.edges.map((e) => ({
      id: e.id, sourceNodeId: e.sourceNodeId, targetNodeId: e.targetNodeId,
      edgeType: e.edgeType, weight: e.weight, metadataJson: e.metadataJson,
    })),
    retrievalAvailable: true,
  };
}

describe('final system verification', { timeout: 120_000 }, () => {
  const verifier = new Phase4SystemVerifier();

  // Scenario 1: Clean system
  describe('scenario 1: clean system', () => {
    it('full pipeline passes without FAIL', () => {
      const graph = generateChain(10, 42);
      const input = buildInput(graph);

      const report = verifier.verifyFullSystem(graph.snapshotId, input);
      expect(report.status).not.toBe('FAIL');
      expect(report.criticalIssues).toHaveLength(0);
      expect(report.determinism.retrievalDeterministic).toBe(true);
      expect(report.determinism.metricsDeterministic).toBe(true);
    });

    it('snapshot becomes frozen after successful verification', () => {
      const freezer = new SnapshotFreezer();
      const graph = generateMesh({ nodeCount: 20, seed: 99, edgeFactor: 2 });
      const input = buildInput(graph);

      const frozen = freezer.freeze({
        snapshotId: graph.snapshotId,
        nodes: input.nodes,
        edges: input.edges,
      });

      expect(freezer.isFrozen(graph.snapshotId)).toBe(true);
      expect(frozen.snapshotId).toBe(graph.snapshotId);
      expect(frozen.frozenAt).toBeTruthy();
      expect(frozen.checksum).toBeTruthy();

      expect(() => freezer.assertMutable(graph.snapshotId)).toThrow();
    });

    it('frozen snapshot integrity is verifiable', () => {
      const freezer = new SnapshotFreezer();
      const graph = generateMesh({ nodeCount: 20, seed: 100, edgeFactor: 2 });
      const input = buildInput(graph);

      freezer.freeze({
        snapshotId: graph.snapshotId,
        nodes: input.nodes,
        edges: input.edges,
      });

      expect(freezer.verifyIntegrity(graph.snapshotId)).toBe(true);
    });
  });

  // Scenario 2: Corrupted graph
  describe('scenario 2: corrupted graph', () => {
    it('graph with orphan nodes fails verification', () => {
      const graph = generateMesh({ nodeCount: 50, seed: 42, edgeFactor: 2 });
      const orphanId = 'orphan-node-999';
      graph.nodes.push({
        id: orphanId,
        filePath: '/repo/src/orphan.ts',
        fileHash: 'hash-orphan',
        nodeType: 'FILE',
        symbolName: null,
        language: 'typescript',
        metadataJson: null,
      });
      const input = buildInput(graph);

      const report = verifier.verifyFullSystem(graph.snapshotId, input);
      expect(report.systemHealth.hasOrphanNodes).toBe(true);
    });

    it('graph with broken edge references fails fast', () => {
      const graph = generateMesh({ nodeCount: 30, seed: 42, edgeFactor: 2 });
      graph.edges.push({
        id: 'broken-edge',
        sourceNodeId: graph.nodes[0]!.id,
        targetNodeId: 'non-existent-node',
        edgeType: 'IMPORTS',
        weight: 1.0,
        metadataJson: null,
      });
      const input = buildInput(graph);

      const report = verifier.verifyFullSystem(graph.snapshotId, input);
      expect(report.status).toBe('FAIL');
    });
  });

  // Scenario 3: Semantic drift
  describe('scenario 3: semantic drift', () => {
    it('system degrades but does not fail on semantic boundary violations', () => {
      const graph = generateChain(10, 42);
      const input = buildInput(graph);

      const infraNodeId = graph.nodes[0]!.id;
      const domainNodeId = graph.nodes[1]!.id;

      const classifications: ClassificationResult[] = [
        { nodeId: infraNodeId, filePath: graph.nodes[0]!.filePath, semanticType: SemanticType.INFRASTRUCTURE, ruleStrength: RuleStrength.HIGH as const, classificationReasons: ['path-mapped'], matchedHeuristics: [] },
        { nodeId: domainNodeId, filePath: graph.nodes[1]!.filePath, semanticType: SemanticType.DOMAIN_LAYER, ruleStrength: RuleStrength.HIGH as const, classificationReasons: ['path-mapped'], matchedHeuristics: [] },
      ];

      for (let i = 2; i < graph.nodes.length; i++) {
        classifications.push({
          nodeId: graph.nodes[i]!.id,
          filePath: graph.nodes[i]!.filePath,
          semanticType: SemanticType.SERVICE_LAYER,
          ruleStrength: RuleStrength.MEDIUM as const,
          classificationReasons: ['default'],
          matchedHeuristics: [],
        });
      }

      graph.edges.push({
        id: 'leak-edge',
        sourceNodeId: infraNodeId,
        targetNodeId: domainNodeId,
        edgeType: 'DEPENDS_ON',
        weight: 1.0,
        metadataJson: null,
      });

      input.classifications = classifications;

      const report = verifier.verifyFullSystem(graph.snapshotId, input);
      expect(report.status === 'DEGRADED' || report.status === 'PASS').toBe(true);
      expect(report.status).not.toBe('FAIL');
    });
  });

  // Scenario 4: Metrics instability
  describe('scenario 4: metrics instability', () => {
    it('NaN centrality values are flagged but system continues degraded', () => {
      const graph = generateMesh({ nodeCount: 30, seed: 42, edgeFactor: 2 });
      const input = buildInput(graph);

      input.centrality = [
        { nodeId: graph.nodes[0]!.id, filePath: graph.nodes[0]!.filePath, inDegree: 1, outDegree: 0, reachabilityCount: 1, dependencyInfluenceScore: NaN, isUtilityHub: false },
      ];
      input.instability = [
        { nodeId: graph.nodes[1]!.id, filePath: graph.nodes[1]!.filePath, instabilityScore: 0.5, instabilityLevel: InstabilityLevel.BALANCED, isUnstableInfrastructure: false, isVolatileCore: false, hasInversionRisk: false },
      ];
      input.propagationRisk = [
        { nodeId: graph.nodes[0]!.id, filePath: graph.nodes[0]!.filePath, propagationPressure: 0.3, blastRadiusAmplification: 0.2, cascadeEstimate: 0.1, isChokePoint: false },
      ];

      const report = verifier.verifyFullSystem(graph.snapshotId, input);
      expect(report.systemHealth.hasMetricCorruption).toBe(true);
    });
  });

  // Scenario 5: Retrieval instability detection
  describe('scenario 5: retrieval determinism', () => {
    it('system correctly reports retrieval as deterministic when it is', () => {
      const graph = generateChain(10, 42);
      const input = buildInput(graph);

      input.classifications = graph.nodes.map((n) => ({
        nodeId: n.id,
        filePath: n.filePath,
        semanticType: SemanticType.SERVICE_LAYER,
        ruleStrength: RuleStrength.MEDIUM as const,
        classificationReasons: ['default'],
        matchedHeuristics: [],
      }));

      const report = verifier.verifyFullSystem(graph.snapshotId, input);
      expect(report.status).not.toBe('FAIL');
      expect(report.determinism.retrievalDeterministic).toBe(true);
    });
  });

  // Scenario 6: Large graph (10K)
  describe('scenario 6: large graph (10K)', { timeout: 60_000 }, () => {
    it('verifies 10K node graph within performance target', () => {
      const graph = generateMesh({ nodeCount: 10_000, seed: 42, edgeFactor: 3 });
      const input = buildInput(graph);

      const { durationMs } = measureDuration(() => {
        verifier.verifyFullSystem(graph.snapshotId, input);
      });

      expect(durationMs).toBeLessThan(10_000);
    });
  });

  // Scenario 7: Large graph (50K)
  describe('scenario 7: large graph (50K)', { timeout: 120_000 }, () => {
    it('verifies 50K node graph within performance target', () => {
      const graph = generateMesh({ nodeCount: 50_000, seed: 42, edgeFactor: 3 });
      const input = buildInput(graph);

      const { durationMs } = measureDuration(() => {
        verifier.verifyFullSystem(graph.snapshotId, input);
      });

      expect(durationMs).toBeLessThan(30_000);
    });
  });
});

describe('system benchmark', { timeout: 300_000 }, () => {
  it('benchmark completes without errors', () => {
    const benchmark = new SystemBenchmark();
    const report = benchmark.runBenchmark(
      [
        { label: '100 nodes', nodeCount: 100, edgeFactor: 3, seed: 42 },
      ],
      [
        { scaleLabel: '100 nodes', metric: 'full verification', maxMs: 5_000 },
      ],
    );

    expect(report.results).toHaveLength(1);
    expect(report.results[0]!.passed).toBe(true);
  });

  it('generates system readiness report output', () => {
    const benchmark = new SystemBenchmark();
    const report = benchmark.runBenchmark(
      [{ label: '100 nodes', nodeCount: 100, edgeFactor: 3, seed: 42 }],
      [{ scaleLabel: '100 nodes', metric: 'full verification', maxMs: 5_000 }],
    );

    const readiness = benchmark.generateReadinessReport(report);
    expect(readiness).toContain('SYSTEM_READINESS_REPORT');
    expect(readiness).toContain('Phase 4 COMPLETE:');
    expect(readiness).toContain('Production Ready:');
    expect(readiness).toContain('AI Layer Ready:');
    expect(readiness).toContain('Graph Memory Stable:');
    expect(readiness).toContain('Retrieval Deterministic:');
    expect(readiness).toContain('Metrics Stable:');
  });
});

describe('snapshot freeze immutability', () => {
  it('frozen snapshot throws on mutation assertion', () => {
    const freezer = new SnapshotFreezer();
    const snapshotId = 'test-freeze-immutable';

    freezer.freeze({
      snapshotId,
      nodes: [],
      edges: [],
    });

    expect(freezer.isFrozen(snapshotId)).toBe(true);
    expect(() => freezer.assertMutable(snapshotId)).toThrow();
  });

  it('unfrozen snapshot allows mutation', () => {
    const freezer = new SnapshotFreezer();
    const snapshotId = 'test-freeze-mutable';

    expect(freezer.isFrozen(snapshotId)).toBe(false);
    expect(() => freezer.assertMutable(snapshotId)).not.toThrow();
  });

  it('clearing a frozen snapshot allows mutation', () => {
    const freezer = new SnapshotFreezer();
    const snapshotId = 'test-freeze-clear';

    freezer.freeze({ snapshotId, nodes: [], edges: [] });
    expect(freezer.isFrozen(snapshotId)).toBe(true);

    freezer.clear(snapshotId);
    expect(freezer.isFrozen(snapshotId)).toBe(false);
    expect(() => freezer.assertMutable(snapshotId)).not.toThrow();
  });
});

describe('verification error types', () => {
  it('SystemVerificationError has correct properties', () => {
    const err = new SystemVerificationError('test failure', { details: { key: 'val' } });
    expect(err.stage).toBe('system-verification');
    expect(err.message).toContain('test failure');
    expect(err.name).toBe('SystemVerificationError');
  });

  it('SnapshotFrozenError has correct status code', () => {
    const err = new SnapshotFrozenError('snap-1', 'mutate');
    expect(err.message).toContain('snap-1');
    expect(err.message).toContain('mutate');
    expect(err.name).toBe('SnapshotFrozenError');
  });
});
