import type { AntiPatternResult } from '../types/index.ts';
import type { InsightSeverity } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export interface CoreNodeMetrics {
  id: string;
  instability: number;
  isCore: boolean;
  dependents: number;
}

export function detectUnstableCore(
  nodes: CoreNodeMetrics[],
  instabilityThreshold = 0.5,
): AntiPatternResult[] {
  const results: AntiPatternResult[] = [];
  const coreNodes = nodes.filter(n => n.isCore && n.instability > instabilityThreshold);
  for (const node of coreNodes) {
    const severity: InsightSeverity = node.instability > 0.8 ? 'CRITICAL' : node.instability > 0.65 ? 'HIGH' : 'MODERATE';
    const id = generateId('unstable-core');
    results.push({
      id,
      pattern: 'unstable-core',
      severity,
      confidence: 0.9,
      description: `Core node ${node.id} has instability ${node.instability.toFixed(2)} with ${node.dependents} dependents`,
      nodes: [node.id],
      edges: [],
      metrics: {
        instability: node.instability,
        dependentCount: node.dependents,
        threshold: instabilityThreshold,
      },
      evidence: [],
    });
  }
  return results;
}
