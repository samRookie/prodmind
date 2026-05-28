import type { SmellResult } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export function detectComplexitySmells(
  _nodeCount: number,
  _edgeCount: number,
  _density: number,
  avgDegree: number,
): SmellResult[] {
  const results: SmellResult[] = [];
  if (avgDegree > 10) {
    results.push({
      id: generateId('complexity-smell'),
      smell: 'high-avg-degree',
      severity: avgDegree > 20 ? 'HIGH' : 'MODERATE',
      confidence: 0.85,
      description: `Average node degree is ${avgDegree.toFixed(1)}, indicating high graph complexity`,
      affectedNodes: [],
      affectedEdges: [],
      metrics: { avgDegree },
    });
  }
  return results;
}

export function detectVolatilitySmells(
  changeFrequency: Record<string, number>,
  threshold = 5,
): SmellResult[] {
  return Object.entries(changeFrequency)
    .filter(([, freq]) => freq > threshold)
    .map(([node, freq]) => ({
      id: generateId('volatility-smell'),
      smell: 'high-volatility',
      severity: freq > threshold * 2 ? 'HIGH' : 'MODERATE',
      confidence: 0.75,
      description: `Node ${node} has high change frequency (${freq} changes)`,
      affectedNodes: [node],
      affectedEdges: [],
      metrics: { changeFrequency: freq, threshold },
    }));
}
