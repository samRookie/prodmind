import type { PatternDetection, PatternInput } from '../pattern-types.ts';

export function detectPropagationPatterns(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  for (const pr of input.propagationRisk) {
    if (pr.isChokePoint || pr.propagationPressure >= 0.5) {
      results.push({
        patternType: 'PROPAGATION_HUB', isAntiPattern: true,
        severity: pr.propagationPressure >= 0.7 ? 'CRITICAL' : 'HIGH',
        confidence: Math.min(pr.blastRadiusAmplification, 1),
        fingerprint: '', title: `Propagation risk: ${pr.nodeId}`,
        summary: `Propagation pressure ${pr.propagationPressure.toFixed(3)}, cascade estimate ${pr.cascadeEstimate.toFixed(3)}`,
        impactedNodes: [pr.nodeId], impactedClusters: [],
        topologyEvidence: [], sccEvidence: [],
        metricEvidence: [{ metricType: 'PROPAGATION_PRESSURE', metricValue: pr.propagationPressure, description: `Pressure: ${pr.propagationPressure.toFixed(3)}` }],
        metadata: { propagationPressure: pr.propagationPressure, blastRadiusAmplification: pr.blastRadiusAmplification, cascadeEstimate: pr.cascadeEstimate, isChokePoint: pr.isChokePoint },
      });
    }
  }
  return results;
}
