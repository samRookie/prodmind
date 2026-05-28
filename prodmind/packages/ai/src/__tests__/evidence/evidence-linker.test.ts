import { describe, expect, it } from 'vitest';
import { EvidenceLinker } from '../../evidence/evidence-linker.ts';
import type { EvidenceLinkingInput } from '../../evidence/evidence-types.ts';

function makeInput(overrides?: Partial<EvidenceLinkingInput>): EvidenceLinkingInput {
  return {
    insightFingerprint: 'fp-test',
    insightCategory: 'HOTSPOT',
    insightSeverity: 'HIGH',
    insightScope: 'NODE',
    insightTitle: 'Test',
    insightSummary: 'Test summary',
    evidence: [
      { nodeId: 'n1', metricType: 'FAN_ANALYSIS', metricValue: 50, description: 'Hotspot data' },
    ],
    snapshotId: 'snap-1',
    graphNodes: [
      { id: 'n1', filePath: 'src/a.ts', nodeType: 'module' },
      { id: 'n2', filePath: 'src/b.ts', nodeType: 'module' },
    ],
    graphEdges: [{ id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2' }],
    metrics: [
      { nodeId: 'n1', metricType: 'FAN_ANALYSIS', metricValue: 50, metricScope: 'NODE' },
      { nodeId: 'n2', metricType: 'CENTRALITY', metricValue: 0.3, metricScope: 'NODE' },
    ],
    sccData: { componentCount: 0, componentMap: new Map(), componentNodes: new Map() },
    ruleTriggers: [{ ruleId: 'rule-001', ruleName: 'Test rule' }],
    ...overrides,
  };
}

describe('EvidenceLinker', () => {
  it('links evidence to records', () => {
    const linker = new EvidenceLinker();
    const records = linker.link(makeInput());
    expect(records).toHaveLength(1);
  });

  it('includes node references in payload', () => {
    const linker = new EvidenceLinker();
    const records = linker.link(makeInput());
    const payload = records[0]!.payload;
    expect(payload.graphNodes.length).toBeGreaterThan(0);
    expect(payload.graphNodes[0]!.nodeId).toBe('n1');
  });

  it('includes metric references', () => {
    const linker = new EvidenceLinker();
    const records = linker.link(makeInput());
    const payload = records[0]!.payload;
    expect(payload.metrics.length).toBeGreaterThan(0);
  });

  it('includes rule triggers', () => {
    const linker = new EvidenceLinker();
    const records = linker.link(makeInput());
    const payload = records[0]!.payload;
    expect(payload.ruleTriggers).toHaveLength(1);
    expect(payload.ruleTriggers[0]!.ruleId).toBe('rule-001');
  });

  it('deduplicates node references', () => {
    const linker = new EvidenceLinker();
    const records = linker.link(makeInput({
      evidence: [
        { nodeId: 'n1', description: 'First' },
        { nodeId: 'n1', description: 'Second' },
      ],
    }));
    expect(records[0]!.payload.graphNodes).toHaveLength(1);
  });

  it('builds summary text', () => {
    const linker = new EvidenceLinker();
    const records = linker.link(makeInput());
    expect(records[0]!.payload.summaryText.length).toBeGreaterThan(0);
  });

  it('includes SCC data when available', () => {
    const linker = new EvidenceLinker();
    const records = linker.link(makeInput({
      sccData: {
        componentCount: 1,
        componentMap: new Map([['n1', 0], ['n2', 0]]),
        componentNodes: new Map([[0, ['n1', 'n2']]]),
      },
    }));
    expect(records[0]!.payload.sccs).toHaveLength(1);
    expect(records[0]!.payload.sccs[0]!.nodeCount).toBe(2);
  });
});
