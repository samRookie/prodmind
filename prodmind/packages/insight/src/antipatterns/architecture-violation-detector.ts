import type { AntiPatternResult } from '../types/index.ts';
import type { InsightSeverity } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export interface LayerMapping {
  nodeId: string;
  layer: string;
}

export interface AllowedDependency {
  fromLayer: string;
  toLayer: string;
}

export function detectArchitectureViolations(
  mappings: LayerMapping[],
  edges: Array<{ source: string; target: string }>,
  allowedDependencies: AllowedDependency[],
): AntiPatternResult[] {
  const nodeLayer = new Map(mappings.map(m => [m.nodeId, m.layer]));
  const allowedSet = new Set(allowedDependencies.map(a => `${a.fromLayer}:${a.toLayer}`));
  const results: AntiPatternResult[] = [];

  for (const edge of edges) {
    const fromLayer = nodeLayer.get(edge.source);
    const toLayer = nodeLayer.get(edge.target);
    if (!fromLayer || !toLayer) continue;
    if (fromLayer === toLayer) continue;
    if (!allowedSet.has(`${fromLayer}:${toLayer}`)) {
      const severity: InsightSeverity = 'HIGH';
      const id = generateId('arch-violation');
      results.push({
        id,
        pattern: 'architecture-violation',
        severity,
        confidence: 0.95,
        description: `Layer violation: ${edge.source} (${fromLayer}) -> ${edge.target} (${toLayer}) is not permitted`,
        nodes: [edge.source, edge.target],
        edges: [`${edge.source}->${edge.target}`],
        metrics: { violationCount: 1 },
        evidence: [],
      });
    }
  }
  return results;
}
