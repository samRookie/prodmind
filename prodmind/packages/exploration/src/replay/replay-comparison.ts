import type { TraversalResult, GraphQuery } from '../types/index.ts';

export class ReplayComparison {
  public static compareTraversalSets(
    baseline: Map<string, TraversalResult>,
    candidate: Map<string, TraversalResult>,
  ): Array<{ key: string; identical: boolean; differences: string[] }> {
    const results: Array<{ key: string; identical: boolean; differences: string[] }> = [];
    const allKeys = new Set([...baseline.keys(), ...candidate.keys()]);
    for (const key of allKeys) {
      const base = baseline.get(key);
      const cand = candidate.get(key);
      if (!base || !cand) {
        results.push({
          key,
          identical: false,
          differences: [!base ? 'missing in baseline' : 'missing in candidate'],
        });
        continue;
      }
      const differences: string[] = [];
      if (base.strategy !== cand.strategy) differences.push(`strategy: ${base.strategy} vs ${cand.strategy}`);
      if (base.nodeCount !== cand.nodeCount) differences.push(`nodeCount: ${base.nodeCount} vs ${cand.nodeCount}`);
      if (base.steps.length !== cand.steps.length) differences.push(`steps length: ${base.steps.length} vs ${cand.steps.length}`);
      for (let i = 0; i < Math.min(base.steps.length, cand.steps.length); i++) {
        if (base.steps[i]!.nodeId !== cand.steps[i]!.nodeId) {
          differences.push(`step[${i}]: ${base.steps[i]!.nodeId} vs ${cand.steps[i]!.nodeId}`);
        }
      }
      results.push({ key, identical: differences.length === 0, differences });
    }
    return results;
  }

  public static compareQuerySets(
    baseline: Map<string, GraphQuery>,
    candidate: Map<string, GraphQuery>,
  ): Array<{ key: string; identical: boolean; differences: string[] }> {
    const results: Array<{ key: string; identical: boolean; differences: string[] }> = [];
    const allKeys = new Set([...baseline.keys(), ...candidate.keys()]);
    for (const key of allKeys) {
      const base = baseline.get(key);
      const cand = candidate.get(key);
      if (!base || !cand) {
        results.push({
          key,
          identical: false,
          differences: [!base ? 'missing in baseline' : 'missing in candidate'],
        });
        continue;
      }
      const differences: string[] = [];
      if (base.target !== cand.target) differences.push(`target: ${base.target} vs ${cand.target}`);
      const baseClauses = JSON.stringify(base.clauses);
      const candClauses = JSON.stringify(cand.clauses);
      if (baseClauses !== candClauses) differences.push('clauses differ');
      results.push({ key, identical: differences.length === 0, differences });
    }
    return results;
  }

  public static summarizeResults(
    comparisons: Array<{ key: string; identical: boolean }>,
  ): { total: number; identical: number; different: number; matchRate: number } {
    const total = comparisons.length;
    const identical = comparisons.filter((c) => c.identical).length;
    const different = total - identical;
    const matchRate = total > 0 ? identical / total : 1;
    return { total, identical, different, matchRate };
  }
}
