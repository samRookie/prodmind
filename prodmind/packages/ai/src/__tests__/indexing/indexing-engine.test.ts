import { describe, it, expect } from 'vitest';
import { IndexingEngine } from '../../indexing/indexing-engine.ts';

describe('IndexingEngine', () => {
  it('builds indexes from input', () => {
    const engine = new IndexingEngine();
    engine.build({
      nodes: [{ id: 'n1', type: 'module', name: 'core', subsystem: 'engine' }],
      edges: [],
      risks: [{ riskType: 'STABILITY_RISK', severity: 'CRITICAL', normalizedScore: 0.85, impactedNodes: ['n1'] }],
      hotspots: [],
      patterns: [],
      recommendations: [],
      trends: [],
      cognitions: [],
      narratives: [],
    });
    expect(engine.size).toBeGreaterThan(0);
    expect(engine.getIndex('NODE_INDEX')).toBeDefined();
  });
});
