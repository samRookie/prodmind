import type { SmellResult } from '../types/index.ts';
import type { InsightSeverity } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export interface CouplingDensityInput {
  nodeId: string;
  couplingDensity: number;
  threshold: number;
}

export function detectHighCouplingDensity(inputs: CouplingDensityInput[]): SmellResult[] {
  return inputs.filter(i => i.couplingDensity > i.threshold).map(input => {
    const severity: InsightSeverity = input.couplingDensity > input.threshold * 2 ? 'HIGH' : 'MODERATE';
    return {
      id: generateId('coupling-smell'),
      smell: 'high-coupling-density',
      severity,
      confidence: 0.85,
      description: `High coupling density in ${input.nodeId}: ${input.couplingDensity.toFixed(3)} (threshold: ${input.threshold})`,
      affectedNodes: [input.nodeId],
      affectedEdges: [],
      metrics: { couplingDensity: input.couplingDensity, threshold: input.threshold },
    };
  });
}

export function detectFragmentation(components: number, expectedComponents: number): SmellResult | null {
  if (components > expectedComponents * 1.5) {
    return {
      id: generateId('fragmentation-smell'),
      smell: 'architectural-fragmentation',
      severity: components > expectedComponents * 2 ? 'HIGH' : 'MODERATE',
      confidence: 0.8,
      description: `Graph is fragmented into ${components} components (expected ~${expectedComponents})`,
      affectedNodes: [],
      affectedEdges: [],
      metrics: { components, expectedComponents, ratio: components / expectedComponents },
    };
  }
  return null;
}
