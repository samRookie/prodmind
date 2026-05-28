import type { PatternDetection, PatternInput } from '../pattern-types.ts';

export function detectCyclicPatterns(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  for (const [compId, nodes] of input.sccData.componentNodes) {
    if (nodes.length <= 1) continue;
    results.push({
      patternType: 'CYCLIC_CLUSTER', isAntiPattern: true, severity: nodes.length > 5 ? 'CRITICAL' : nodes.length > 3 ? 'HIGH' : 'MODERATE',
      confidence: Math.min(nodes.length / 10, 1), fingerprint: '', title: `Cyclic dependency group (${nodes.length} nodes)`,
      summary: `${nodes.length} modules form a cyclic dependency group in component ${compId}`,
      impactedNodes: nodes, impactedClusters: [],
      topologyEvidence: [], sccEvidence: [{ componentId: compId, componentSize: nodes.length, memberNodes: nodes }],
      metricEvidence: [{ metricType: 'SCC_SIZE', metricValue: nodes.length, description: `SCC size: ${nodes.length}` }],
      metadata: { componentId: compId, nodeCount: nodes.length },
    });
  }
  return results;
}
