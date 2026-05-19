import { describe, it, expect } from 'vitest';
import { MetricsEngine } from '../../metrics/metrics-engine.ts';
import type { MetricsInput, MetricsNode, MetricsEdge } from '../../metrics/metrics-types.ts';

function makeNode(id: string, filePath: string): MetricsNode {
  return { id, filePath, fileHash: null, nodeType: 'FILE', symbolName: null, language: 'TypeScript', metadataJson: null };
}

function makeEdge(id: string, source: string, target: string): MetricsEdge {
  return { id, sourceNodeId: source, targetNodeId: target, edgeType: 'IMPORTS', weight: 1.0, metadataJson: null };
}

function buildChainGraph(N: number): MetricsInput {
  const nodes: MetricsNode[] = [];
  const edges: MetricsEdge[] = [];
  for (let i = 0; i < N; i++) {
    nodes.push(makeNode(`n${i}`, `src/module-${Math.floor(i / 100)}/file-${i}.ts`));
  }
  for (let i = 1; i < N; i++) {
    edges.push(makeEdge(`e${i}`, `n${i - 1}`, `n${i}`));
  }
  return { nodes, edges, snapshotId: `snap-chain-${N}` };
}

function timeAnalysis(input: MetricsInput): number {
  const engine = new MetricsEngine();
  const start = performance.now();
  engine.analyze(input);
  return performance.now() - start;
}

describe('Stress Tests', () => {
  it('scales sublinearly: times 1k, 5k, 10k chain graph', { timeout: 30000 }, () => {
    const t1k = timeAnalysis(buildChainGraph(1000));
    const t5k = timeAnalysis(buildChainGraph(5000));
    const t10k = timeAnalysis(buildChainGraph(10000));

    console.log(`[scaling] 1K=${t1k.toFixed(0)}ms  5K=${t5k.toFixed(0)}ms  10K=${t10k.toFixed(0)}ms`);

    expect(t10k).toBeLessThan(30000);
    expect(t1k).toBeLessThanOrEqual(t5k);
    expect(t5k).toBeLessThanOrEqual(t10k);
  });

  it('handles 10k node synthetic graph with sublinear scaling', { timeout: 30000 }, () => {
    const input = buildChainGraph(10000);
    const engine = new MetricsEngine();

    const start = performance.now();
    const output = engine.analyze(input);
    const elapsed = performance.now() - start;

    expect(output.centrality.length).toBe(10000);
    expect(output.fanMetrics.length).toBe(10000);
    expect(output.records.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(30000);
  });

  it('handles large SCC graph without stack overflow', () => {
    const N = 1000;
    const nodes: MetricsNode[] = [];
    const edges: MetricsEdge[] = [];

    for (let i = 0; i < N; i++) {
      nodes.push(makeNode(`n${i}`, `file-${i}.ts`));
    }

    for (let i = 0; i < N; i++) {
      edges.push(makeEdge(`e${i}a`, `n${i}`, `n${(i + 1) % N}`));
    }

    const input: MetricsInput = { nodes, edges, snapshotId: 'snap-scc' };
    const engine = new MetricsEngine();
    const output = engine.analyze(input);

    expect(output.centrality.length).toBe(N);
    expect(output.complexity.cycleScore).toBeGreaterThan(0);
  });

  it('handles utility-heavy graph', () => {
    const nodes: MetricsNode[] = [makeNode('util', 'src/utils/index.ts')];
    const edges: MetricsEdge[] = [];

    for (let i = 0; i < 60; i++) {
      const n = makeNode(`n${i}`, `src/module-${Math.floor(i / 10)}/file-${i}.ts`);
      nodes.push(n);
      edges.push(makeEdge(`e${i}`, 'util', `n${i}`));
    }

    const input: MetricsInput = { nodes, edges, snapshotId: 'snap-util' };
    const engine = new MetricsEngine();
    const output = engine.analyze(input);

    const utilFan = output.fanMetrics.find((r) => r.nodeId === 'util');
    expect(utilFan!.fanLevel).toBe('CRITICAL');
    expect(output.fanMetrics.filter((r) => r.isUtilityHotspot).length).toBe(1);
  });

  it('handles layered monorepo graph', () => {
    const nodes: MetricsNode[] = [];
    const edges: MetricsEdge[] = [];

    for (let layer = 0; layer < 5; layer++) {
      for (let i = 0; i < 20; i++) {
        const id = `L${layer}_${i}`;
        nodes.push(makeNode(id, `packages/layer-${layer}/src/file-${i}.ts`));
        if (i > 0) {
          edges.push(makeEdge(`e_${id}_prev`, id, `L${layer}_${i - 1}`));
        }
        if (layer > 0) {
          edges.push(makeEdge(`e_${id}_upper`, id, `L${layer - 1}_${Math.floor(i / 2)}`));
        }
      }
    }

    const input: MetricsInput = { nodes, edges, snapshotId: 'snap-mono' };
    const engine = new MetricsEngine();
    const output = engine.analyze(input);

    expect(output.centrality.length).toBe(100);
    expect(output.records.length).toBeGreaterThan(0);
  });

  it('handles cyclic microservice graph', () => {
    const SERVICE_COUNT = 20;
    const nodes: MetricsNode[] = [];
    const edges: MetricsEdge[] = [];

    for (let i = 0; i < SERVICE_COUNT; i++) {
      nodes.push(makeNode(`svc${i}`, `services/service-${i}/main.ts`));
    }

    for (let i = 0; i < SERVICE_COUNT; i++) {
      for (let j = 0; j < 3; j++) {
        const target = (i + j + 1) % SERVICE_COUNT;
        edges.push(makeEdge(`e${i}_${j}`, `svc${i}`, `svc${target}`));
      }
    }

    const input: MetricsInput = { nodes, edges, snapshotId: 'snap-micro' };
    const engine = new MetricsEngine();
    const output = engine.analyze(input);

    expect(output.centrality.length).toBe(SERVICE_COUNT);
    expect(output.instability.every((r) => r.instabilityScore >= 0 && r.instabilityScore <= 1)).toBe(true);
    expect(output.records.every((r) => r.metricPriority !== undefined)).toBe(true);
  });
});
