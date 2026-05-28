import type { SmellResult } from '../types/index.ts';
import type { InsightSeverity } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export interface GraphSmellInput {
  edgeCount: number;
  nodeCount: number;
  density: number;
}

export function detectExcessiveDensity(input: GraphSmellInput, maxDensity = 0.3): SmellResult | null {
  if (input.density > maxDensity) {
    const severity: InsightSeverity = input.density > 0.5 ? 'HIGH' : 'MODERATE';
    return {
      id: generateId('density-smell'),
      smell: 'excessive-graph-density',
      severity,
      confidence: 0.85,
      description: `Graph density is ${input.density.toFixed(3)} (threshold: ${maxDensity}) with ${input.nodeCount} nodes, ${input.edgeCount} edges`,
      affectedNodes: [],
      affectedEdges: [],
      metrics: { density: input.density, nodeCount: input.nodeCount, edgeCount: input.edgeCount },
    };
  }
  return null;
}

export interface SCCConcentrationInput {
  sccCount: number;
  nodeCount: number;
  largestSCCSize: number;
}

export function detectExcessiveSCCConcentration(input: SCCConcentrationInput, threshold = 0.4): SmellResult | null {
  const ratio = input.nodeCount > 0 ? input.largestSCCSize / input.nodeCount : 0;
  if (ratio > threshold) {
    const severity: InsightSeverity = ratio > 0.6 ? 'HIGH' : 'MODERATE';
    return {
      id: generateId('scc-smell'),
      smell: 'excessive-scc-concentration',
      severity,
      confidence: 0.9,
      description: `Largest SCC contains ${(ratio * 100).toFixed(1)}% of nodes (${input.largestSCCSize}/${input.nodeCount})`,
      affectedNodes: [],
      affectedEdges: [],
      metrics: { sccRatio: ratio, sccCount: input.sccCount, largestSCCSize: input.largestSCCSize },
    };
  }
  return null;
}
