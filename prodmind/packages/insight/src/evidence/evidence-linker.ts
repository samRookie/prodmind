import type { Insight, InsightEvidence } from '../types/index.ts';

export class EvidenceLinker {
  link(insight: Insight, evidence: InsightEvidence[]): Insight {
    return {
      ...insight,
      evidence: [...insight.evidence, ...evidence],
    };
  }

  linkBatch(insight: Insight, evidenceGroups: InsightEvidence[][]): Insight {
    return {
      ...insight,
      evidence: evidenceGroups.flat(),
    };
  }

  getByType(insight: Insight, type: InsightEvidence['type']): InsightEvidence[] {
    return insight.evidence.filter(e => e.type === type);
  }

  getGraphEvidence(insight: Insight): InsightEvidence[] {
    return this.getByType(insight, 'graph');
  }

  getMetricEvidence(insight: Insight): InsightEvidence[] {
    return this.getByType(insight, 'metric');
  }
}
