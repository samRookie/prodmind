import { describe, it, expect } from 'vitest';
import { IndexBuilder } from '../../indexing/index-builder.ts';
import type { IndexBuildInput } from '../../indexing/indexing-types.ts';

describe('IndexBuilder', () => {
  const input: IndexBuildInput = {
    nodes: [
      { id: 'n1', type: 'module', name: 'core', subsystem: 'engine' },
      { id: 'n2', type: 'module', name: 'utils', subsystem: 'engine' },
    ],
    edges: [{ sourceId: 'n1', targetId: 'n2', type: 'depends' }],
    risks: [{ riskType: 'STABILITY_RISK', severity: 'CRITICAL', normalizedScore: 0.85, impactedNodes: ['n1'] }],
    hotspots: [{ nodeId: 'n1', severity: 'HIGH', reason: 'Hotspot', impactedNodes: ['n1'] }],
    patterns: [],
    recommendations: [],
    trends: [],
    cognitions: [],
    narratives: [],
  };

  it('builds all indexes', () => {
    const builder = new IndexBuilder();
    const indexes = builder.buildAll(input);
    expect(indexes.get('NODE_INDEX')).toBeDefined();
    expect(indexes.get('EDGE_INDEX')).toBeDefined();
    expect(indexes.get('RISK_INDEX')).toBeDefined();
    expect(indexes.get('HOTSPOT_INDEX')).toBeDefined();
    expect(indexes.get('SCC_INDEX')).toBeDefined();
    expect(indexes.get('PATTERN_INDEX')).toBeDefined();
    expect(indexes.get('RECOMMENDATION_INDEX')).toBeDefined();
    expect(indexes.get('COGNITION_INDEX')).toBeDefined();
    expect(indexes.get('NAMESPACE_INDEX')).toBeDefined();
    expect(indexes.get('SUBSYSTEM_INDEX')).toBeDefined();
    expect(indexes.get('NARRATIVE_INDEX')).toBeDefined();
    expect(indexes.get('TREND_INDEX')).toBeDefined();
  });

  it('returns deterministic fingerprint', () => {
    const builder = new IndexBuilder();
    const a = builder.buildAll(input);
    const b = builder.buildAll(input);
    expect(a.get('NODE_INDEX')!.fingerprint).toBe(b.get('NODE_INDEX')!.fingerprint);
  });
});
