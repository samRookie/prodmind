import { describe, it, expect } from 'vitest';
import { MetricsEngine } from '../../metrics/metrics-engine.ts';
import type { MetricsInput, MetricsNode, MetricsEdge } from '../../metrics/metrics-types.ts';

function makeNode(id: string, filePath: string): MetricsNode {
  return { id, filePath, fileHash: null, nodeType: 'FILE', symbolName: null, language: 'TypeScript', metadataJson: null };
}

function makeEdge(id: string, source: string, target: string): MetricsEdge {
  return { id, sourceNodeId: source, targetNodeId: target, edgeType: 'IMPORTS', weight: 1.0, metadataJson: null };
}

describe('MetricsEngine', () => {
  it('produces deterministic output for identical input', () => {
    const input: MetricsInput = {
      nodes: [makeNode('a', 'a.ts'), makeNode('b', 'b.ts')],
      edges: [makeEdge('e1', 'a', 'b')],
      snapshotId: 'snap-1',
    };

    const engine = new MetricsEngine();
    const first = engine.analyze(input);
    const second = engine.analyze(input);

    expect(first.snapshotId).toBe(second.snapshotId);
    expect(first.centrality.length).toBe(second.centrality.length);
    expect(first.fanMetrics.length).toBe(second.fanMetrics.length);
    expect(first.instability.length).toBe(second.instability.length);
    expect(first.propagationRisk.length).toBe(second.propagationRisk.length);
    expect(first.complexity.finalScore).toBe(second.complexity.finalScore);
    expect(first.depth.maxDepth).toBe(second.depth.maxDepth);
    expect(first.records.length).toBe(second.records.length);

    for (let i = 0; i < first.records.length; i++) {
      expect(first.records[i]!.metricType).toBe(second.records[i]!.metricType);
      expect(first.records[i]!.metricValue).toBe(second.records[i]!.metricValue);
    }
  });

  it('generates flat records with metric priority', () => {
    const input: MetricsInput = {
      nodes: [makeNode('a', 'a.ts'), makeNode('b', 'b.ts')],
      edges: [makeEdge('e1', 'a', 'b')],
      snapshotId: 'snap-1',
    };

    const engine = new MetricsEngine();
    const output = engine.analyze(input);
    expect(output.records.length).toBeGreaterThan(0);
    for (const r of output.records) {
      expect(r.metricType).toBeDefined();
      expect(r.metricScope).toBeDefined();
      expect(r.metricPriority).toBeDefined();
      expect(typeof r.metricValue).toBe('number');
    }
  });

  it('handles empty graph', () => {
    const input: MetricsInput = {
      nodes: [],
      edges: [],
      snapshotId: 'snap-1',
    };

    const engine = new MetricsEngine();
    const output = engine.analyze(input);
    expect(output.centrality).toEqual([]);
    expect(output.fanMetrics).toEqual([]);
    expect(output.depth.maxDepth).toBe(0);
    expect(output.complexity.finalScore).toBe(0);
  });

  it('handles cyclic graph', () => {
    const input: MetricsInput = {
      nodes: [makeNode('a', 'a.ts'), makeNode('b', 'b.ts')],
      edges: [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'b', 'a')],
      snapshotId: 'snap-1',
    };

    const engine = new MetricsEngine();
    const output = engine.analyze(input);
    expect(output.centrality.length).toBe(2);
    expect(output.fanMetrics.length).toBe(2);
  });

  it('handles layered architecture input', () => {
    const nodes = [
      makeNode('api', 'src/routes/user.ts'),
      makeNode('svc', 'src/services/user.ts'),
      makeNode('db', 'src/data/repo.ts'),
    ];
    const edges = [
      makeEdge('e1', 'api', 'svc'),
      makeEdge('e2', 'svc', 'db'),
    ];
    const input: MetricsInput = { nodes, edges, snapshotId: 'snap-1' };

    const engine = new MetricsEngine();
    const output = engine.analyze(input);
    expect(output.instability.length).toBe(3);
    expect(output.depth.maxDepth).toBe(3);
  });

  it('handles utility-heavy architecture', () => {
    const nodes = [makeNode('util', 'src/utils/helpers.ts')];
    const edges: MetricsEdge[] = [];
    for (let i = 0; i < 60; i++) {
      const n = makeNode(`n${i}`, `n${i}.ts`);
      nodes.push(n);
      edges.push(makeEdge(`e${i}`, 'util', `n${i}`));
    }
    const input: MetricsInput = { nodes, edges, snapshotId: 'snap-1' };

    const engine = new MetricsEngine();
    const output = engine.analyze(input);
    const util = output.centrality.find((r) => r.nodeId === 'util');
    expect(util).toBeDefined();
    expect(output.fanMetrics.find((r) => r.nodeId === 'util')!.fanLevel).toBe('CRITICAL');
  });
});
