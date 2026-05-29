import type { EvolutionPoint } from '../types/index.ts';

export interface ArchitectureRegressionResult {
  hasRegression: boolean;
  regressionScore: number;
  regressionDirection: string;
  metricDeltas: Record<string, number>;
}

export function detectArchitectureRegression(
  earlier: EvolutionPoint[],
  later: EvolutionPoint[],
): ArchitectureRegressionResult {
  if (earlier.length === 0 || later.length === 0) {
    return { hasRegression: false, regressionScore: 0, regressionDirection: 'insufficient_data', metricDeltas: {} };
  }
  const earlyAvg = averagePoint(earlier);
  const lateAvg = averagePoint(later);
  const complexityDelta = lateAvg.complexity - earlyAvg.complexity;
  const instabilityDelta = lateAvg.instability - earlyAvg.instability;
  const propagationDelta = lateAvg.propagation - earlyAvg.propagation;
  const regressionScore = (complexityDelta + instabilityDelta + propagationDelta) / 3;
  return {
    hasRegression: regressionScore > 0.1,
    regressionScore,
    regressionDirection: regressionScore > 0.1 ? 'degrading' : regressionScore < -0.1 ? 'improving' : 'stable',
    metricDeltas: {
      complexity: complexityDelta,
      instability: instabilityDelta,
      propagation: propagationDelta,
    },
  };
}

function averagePoint(points: EvolutionPoint[]): EvolutionPoint {
  const n = points.length;
  if (n === 0) return { snapshotId: '', timestamp: '', nodeCount: 0, edgeCount: 0, complexity: 0, instability: 0, coupling: 0, propagation: 0, hotspotCount: 0, semanticScore: 0, driftScore: 0 };
  return {
    snapshotId: '',
    timestamp: '',
    nodeCount: points.reduce((s, p) => s + p.nodeCount, 0) / n,
    edgeCount: points.reduce((s, p) => s + p.edgeCount, 0) / n,
    complexity: points.reduce((s, p) => s + p.complexity, 0) / n,
    instability: points.reduce((s, p) => s + p.instability, 0) / n,
    coupling: points.reduce((s, p) => s + p.coupling, 0) / n,
    propagation: points.reduce((s, p) => s + p.propagation, 0) / n,
    hotspotCount: points.reduce((s, p) => s + p.hotspotCount, 0) / n,
    semanticScore: points.reduce((s, p) => s + p.semanticScore, 0) / n,
    driftScore: points.reduce((s, p) => s + p.driftScore, 0) / n,
  };
}
