import type { AntiPatternResult } from '../types/index.ts';
import type { InsightSeverity } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export interface DependencyChain {
  root: string;
  leaf: string;
  depth: number;
  nodes: string[];
}

export function detectDeepChains(
  chains: DependencyChain[],
  maxDepth = 10,
): AntiPatternResult[] {
  const results: AntiPatternResult[] = [];
  for (const chain of chains) {
    if (chain.depth > maxDepth) {
      const severity: InsightSeverity = chain.depth > 15 ? 'HIGH' : 'MODERATE';
      const id = generateId('deep-chain');
      results.push({
        id,
        pattern: 'deep-dependency-chain',
        severity,
        confidence: 0.85,
        description: `Deep dependency chain detected: ${chain.root} -> ... (${chain.depth} levels) -> ${chain.leaf}`,
        nodes: chain.nodes,
        edges: [],
        metrics: { depth: chain.depth, maxDepth },
        evidence: [],
      });
    }
  }
  return results;
}
