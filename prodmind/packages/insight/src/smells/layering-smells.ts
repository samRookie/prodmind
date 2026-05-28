import type { SmellResult } from '../types/index.ts';
import type { InsightSeverity } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export interface LayeringViolationInput {
  nodeId: string;
  layer: string;
  violations: Array<{ targetLayer: string; edgeCount: number }>;
}

export function detectLayeringViolations(inputs: LayeringViolationInput[]): SmellResult[] {
  const results: SmellResult[] = [];
  for (const input of inputs) {
    if (input.violations.length > 0) {
      const severity: InsightSeverity = input.violations.length > 3 ? 'CRITICAL' : input.violations.length > 1 ? 'HIGH' : 'MODERATE';
      results.push({
        id: generateId('layering-smell'),
        smell: 'layering-violation',
        severity,
        confidence: 0.9,
        description: `Layer violation in ${input.nodeId} (${input.layer}): ${input.violations.length} violations`,
        affectedNodes: [input.nodeId],
        affectedEdges: [],
        metrics: { violationCount: input.violations.length },
      });
    }
  }
  return results;
}

export interface SemanticContaminationInput {
  nodeId: string;
  semanticRegion: string;
  foreignEdges: number;
  totalEdges: number;
}

export function detectSemanticContamination(inputs: SemanticContaminationInput[], threshold = 0.3): SmellResult[] {
  return inputs
    .filter(i => i.totalEdges > 0 && i.foreignEdges / i.totalEdges > threshold)
    .map(input => {
      const ratio = input.foreignEdges / input.totalEdges;
      const severity: InsightSeverity = ratio > 0.5 ? 'HIGH' : 'MODERATE';
      return {
        id: generateId('semantic-smell'),
        smell: 'semantic-contamination',
        severity,
        confidence: 0.8,
        description: `Semantic contamination in ${input.nodeId} (${input.semanticRegion}): ${(ratio * 100).toFixed(1)}% foreign edges`,
        affectedNodes: [input.nodeId],
        affectedEdges: [],
        metrics: { foreignRatio: ratio, threshold },
      };
    });
}
