import type { PatternDetection, PatternInput } from '../pattern-types.ts';

export function detectMicroservicePatterns(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  const clusters = input.couplingDensity.clusterDensities;
  const isolatedClusters = clusters.filter(c => c.density < 0.05);
  const cohesiveClusters = clusters.filter(c => c.density > 0.15);
  if (isolatedClusters.length >= 2 && cohesiveClusters.length >= 1) {
    results.push({
      patternType: 'BOUNDED_CONTEXT', isAntiPattern: false, severity: 'MODERATE', confidence: 0.6,
      fingerprint: '', title: 'Microservice-like decomposition detected',
      summary: `${isolatedClusters.length} isolated clusters suggest microservice-boundary decomposition`,
      impactedNodes: input.nodes.map(n => n.id), impactedClusters: isolatedClusters.map(c => c.clusterName),
      topologyEvidence: [], sccEvidence: [], metricEvidence: [{ metricType: 'ISOLATED_CLUSTERS', metricValue: isolatedClusters.length, description: `${isolatedClusters.length} isolated clusters` }],
      metadata: { isolatedClusterCount: isolatedClusters.length, cohesiveClusterCount: cohesiveClusters.length },
    });
  }
  return results;
}
