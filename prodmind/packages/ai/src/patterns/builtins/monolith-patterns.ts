import type { PatternDetection, PatternInput } from '../pattern-types.ts';

export function detectMonolithPatterns(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  const highCoupling = input.couplingDensity.globalDensity > 0.1;
  const fewClusters = input.couplingDensity.clusterDensities.length <= 2;
  if (highCoupling && fewClusters) {
    results.push({
      patternType: 'SERVICE_CLUSTER', isAntiPattern: false, severity: 'HIGH', confidence: 0.7,
      fingerprint: '', title: 'Monolithic structure detected',
      summary: `High coupling (${input.couplingDensity.globalDensity.toFixed(4)}) with only ${input.couplingDensity.clusterDensities.length} clusters suggests monolithic architecture`,
      impactedNodes: input.nodes.map(n => n.id), impactedClusters: [],
      topologyEvidence: [], sccEvidence: [], metricEvidence: [{ metricType: 'GLOBAL_DENSITY', metricValue: input.couplingDensity.globalDensity, description: `Global density: ${input.couplingDensity.globalDensity.toFixed(4)}` }],
      metadata: { globalDensity: input.couplingDensity.globalDensity, clusterCount: input.couplingDensity.clusterDensities.length },
    });
  }
  return results;
}
