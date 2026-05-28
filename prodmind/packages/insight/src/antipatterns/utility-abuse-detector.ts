import type { AntiPatternResult } from '../types/index.ts';
import type { InsightSeverity } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export interface UtilityNodeMetrics {
  id: string;
  incomingDependencies: number;
  outgoingDependencies: number;
  isUtility: boolean;
}

export function detectUtilityAbuse(
  nodes: UtilityNodeMetrics[],
  maxIncomingThreshold = 30,
): AntiPatternResult[] {
  const results: AntiPatternResult[] = [];
  const utilities = nodes.filter(n => n.isUtility);
  for (const node of utilities) {
    if (node.incomingDependencies > maxIncomingThreshold) {
      const severity: InsightSeverity = node.incomingDependencies > 50 ? 'HIGH' : 'MODERATE';
      const id = generateId('utility-abuse');
      results.push({
        id,
        pattern: 'utility-abuse',
        severity,
        confidence: 0.8,
        description: `Utility module ${node.id} has excessive incoming dependencies (${node.incomingDependencies}), indicating utility abuse`,
        nodes: [node.id],
        edges: [],
        metrics: {
          incomingDependencies: node.incomingDependencies,
          threshold: maxIncomingThreshold,
        },
        evidence: [],
      });
    }
  }
  return results;
}
