import { describe, it, expect } from 'vitest';
import { createGraphAnalysisCache } from '../../metrics/graph-analysis-cache.ts';
import { computeFanMetrics, classifyFanLevel, isUtilityHotspot, isGodModule } from '../../metrics/fan-metrics.ts';
import { FanLevel } from '@prodmind/contracts';
import type { MetricsNode, MetricsEdge } from '../../metrics/metrics-types.ts';

function makeNode(id: string, filePath: string): MetricsNode {
  return { id, filePath, fileHash: null, nodeType: 'FILE', symbolName: null, language: 'TypeScript', metadataJson: null };
}

function makeEdge(id: string, source: string, target: string): MetricsEdge {
  return { id, sourceNodeId: source, targetNodeId: target, edgeType: 'IMPORTS', weight: 1.0, metadataJson: null };
}

describe('classifyFanLevel', () => {
  it('classifies CRITICAL for fanIn >= 50', () => {
    expect(classifyFanLevel(50, 0)).toBe(FanLevel.CRITICAL);
  });

  it('classifies CRITICAL for fanOut >= 50', () => {
    expect(classifyFanLevel(0, 50)).toBe(FanLevel.CRITICAL);
  });

  it('classifies CRITICAL for fanIn >= 20 && fanOut >= 20', () => {
    expect(classifyFanLevel(20, 20)).toBe(FanLevel.CRITICAL);
  });

  it('classifies HIGH for fanIn >= 20', () => {
    expect(classifyFanLevel(20, 5)).toBe(FanLevel.HIGH);
  });

  it('classifies HIGH for fanOut >= 20', () => {
    expect(classifyFanLevel(5, 20)).toBe(FanLevel.HIGH);
  });

  it('classifies MODERATE for fanIn >= 5', () => {
    expect(classifyFanLevel(5, 0)).toBe(FanLevel.MODERATE);
  });

  it('classifies LOW for small values', () => {
    expect(classifyFanLevel(0, 0)).toBe(FanLevel.LOW);
    expect(classifyFanLevel(1, 1)).toBe(FanLevel.LOW);
    expect(classifyFanLevel(4, 4)).toBe(FanLevel.LOW);
  });
});

describe('computeFanMetrics', () => {
  it('computes fan-in and fan-out counts', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts'), makeNode('c', 'c.ts')];
    const edges = [makeEdge('e1', 'b', 'a'), makeEdge('e2', 'c', 'a')];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeFanMetrics(cache);
    const a = result.find((r) => r.nodeId === 'a');
    expect(a!.fanIn).toBe(2);
    expect(a!.fanOut).toBe(0);
  });

  it('detects utility hotspot', () => {
    expect(isUtilityHotspot(1, 20)).toBe(true);
    expect(isUtilityHotspot(10, 20)).toBe(false);
  });

  it('detects god module', () => {
    expect(isGodModule(50, 50)).toBe(true);
    expect(isGodModule(10, 10)).toBe(false);
  });

  it('handles empty graph', () => {
    const result = computeFanMetrics(createGraphAnalysisCache([], [], 'snap-1'));
    expect(result).toEqual([]);
  });

  it('produces deterministic output', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts')];
    const edges = [makeEdge('e1', 'a', 'b')];
    const first = computeFanMetrics(createGraphAnalysisCache(nodes, edges, 'snap-1'));
    const second = computeFanMetrics(createGraphAnalysisCache(nodes, edges, 'snap-1'));
    expect(first).toEqual(second);
  });
});
