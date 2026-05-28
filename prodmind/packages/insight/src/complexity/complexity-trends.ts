import type { ComplexityInsight } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export function detectComplexityTrend(
  snapshots: Array<{ timestamp: string; density: number; entropy: number }>,
): ComplexityInsight[] {
  if (snapshots.length < 2) return [];
  const first = snapshots[0]!;
  const last = snapshots[snapshots.length - 1]!;
  const densityDelta = last.density - first.density;
  const entropyDelta = last.entropy - first.entropy;
  const results: ComplexityInsight[] = [];
  if (Math.abs(densityDelta) > 0.05) {
    results.push({
      id: generateId('trend-density'),
      metric: 'density-trend',
      value: densityDelta,
      threshold: 0.05,
      severity: densityDelta > 0.1 ? 'HIGH' : densityDelta > 0.05 ? 'MODERATE' : 'LOW',
      description: `Density ${densityDelta > 0 ? 'increased' : 'decreased'} by ${Math.abs(densityDelta).toFixed(3)}`,
      trend: densityDelta > 0 ? 'increasing' : 'decreasing',
      regions: [],
    });
  }
  if (Math.abs(entropyDelta) > 0.05) {
    results.push({
      id: generateId('trend-entropy'),
      metric: 'entropy-trend',
      value: entropyDelta,
      threshold: 0.05,
      severity: entropyDelta > 0.1 ? 'HIGH' : entropyDelta > 0.05 ? 'MODERATE' : 'LOW',
      description: `Entropy ${entropyDelta > 0 ? 'increased' : 'decreased'} by ${Math.abs(entropyDelta).toFixed(3)}`,
      trend: entropyDelta > 0 ? 'increasing' : 'decreasing',
      regions: [],
    });
  }
  return results;
}

export function computeComplexityThresholds(
  nodeCount: number,
  _edgeCount: number,
): { maxDensity: number; maxDegree: number; maxSCCRatio: number } {
  return {
    maxDensity: 0.3,
    maxDegree: Math.max(20, nodeCount * 0.1),
    maxSCCRatio: 0.4,
  };
}
