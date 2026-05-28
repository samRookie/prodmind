import type { AntiPatternResult } from '../types/index.ts';
import type { InsightSeverity } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export interface BoundaryViolation {
  nodeId: string;
  expectedBoundary: string;
  actualBoundary: string;
  violationType: string;
}

export function detectBoundaryErosion(
  violations: BoundaryViolation[],
): AntiPatternResult[] {
  const results: AntiPatternResult[] = [];
  const grouped = new Map<string, BoundaryViolation[]>();
  for (const v of violations) {
    const key = v.expectedBoundary;
    const list = grouped.get(key) ?? [];
    list.push(v);
    grouped.set(key, list);
  }

  for (const [boundary, vios] of grouped) {
    const severity: InsightSeverity = vios.length > 5 ? 'CRITICAL' : vios.length > 3 ? 'HIGH' : 'MODERATE';
    const id = generateId('boundary-erosion');
    results.push({
      id,
      pattern: 'boundary-erosion',
      severity,
      confidence: 0.85,
      description: `Boundary erosion detected for ${boundary}: ${vios.length} violations`,
      nodes: vios.map(v => v.nodeId),
      edges: [],
      metrics: {
        violationCount: vios.length,
        boundaryCode: 1,
      },
      evidence: [],
    });
  }
  return results;
}
