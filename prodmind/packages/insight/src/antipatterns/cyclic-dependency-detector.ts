import type { AntiPatternResult } from '../types/index.ts';
import type { InsightSeverity } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export interface EdgeRef {
  source: string;
  target: string;
}

export function detectCycles(edges: EdgeRef[]): string[][] {
  const graph = new Map<string, string[]>();
  for (const e of edges) {
    const neighbors = graph.get(e.source) ?? [];
    neighbors.push(e.target);
    graph.set(e.source, neighbors);
    if (!graph.has(e.target)) graph.set(e.target, []);
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];
  const path: string[] = [];

  function dfs(node: string): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);
    const neighbors = graph.get(node) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recursionStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart >= 0) {
          cycles.push([...path.slice(cycleStart), neighbor]);
        }
      }
    }
    path.pop();
    recursionStack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }
  return cycles;
}

export function detectCyclicDependencies(
  edges: EdgeRef[],
): AntiPatternResult[] {
  const cycles = detectCycles(edges);
  const results: AntiPatternResult[] = [];

  for (const cycle of cycles) {
    const cycleSize = cycle.length - 1;
    const severity: InsightSeverity = cycleSize > 5 ? 'CRITICAL' : cycleSize > 3 ? 'HIGH' : 'MODERATE';
    const id = generateId('cyclic-dep');
    const cycleEdges: string[] = [];
    for (let i = 0; i < cycle.length - 1; i++) {
      cycleEdges.push(`${cycle[i]}->${cycle[i + 1]}`);
    }
    results.push({
      id,
      pattern: 'cyclic-dependency',
      severity,
      confidence: 0.95,
      description: `Cyclic dependency detected: ${cycle.slice(0, -1).join(' -> ')} -> ${cycle[0]}`,
      nodes: cycle.slice(0, -1),
      edges: cycleEdges,
      metrics: { cycleSize, cycleCount: cycles.length },
      evidence: [],
    });
  }
  return results;
}
