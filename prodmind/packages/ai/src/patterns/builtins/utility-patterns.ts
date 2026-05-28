import type { PatternDetection, PatternInput } from '../pattern-types.ts';

export function detectUtilityPatterns(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  const utilityHubs = input.centrality.filter(c => c.isUtilityHub);
  for (const hub of utilityHubs) {
    const fm = input.fanMetrics.find(f => f.nodeId === hub.nodeId);
    if (fm && fm.fanIn > 10) {
      results.push({
        patternType: 'UTILITY_GRAVITY_WELL', isAntiPattern: true, severity: fm.fanIn > 50 ? 'CRITICAL' : fm.fanIn > 30 ? 'HIGH' : 'MODERATE',
        confidence: Math.min(fm.concentration, 1), fingerprint: '', title: `Utility pattern: ${hub.nodeId}`,
        summary: `Utility hub with fan-in ${fm.fanIn} and concentration ${fm.concentration.toFixed(3)}`,
        impactedNodes: [hub.nodeId], impactedClusters: [],
        topologyEvidence: [], sccEvidence: [], metricEvidence: [{ metricType: 'FAN_IN', metricValue: fm.fanIn, description: `Fan-in: ${fm.fanIn}` }],
        metadata: { fanIn: fm.fanIn, concentration: fm.concentration },
      });
    }
  }
  return results;
}
