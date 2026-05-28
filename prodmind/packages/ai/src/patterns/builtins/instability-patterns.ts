import type { PatternDetection, PatternInput } from '../pattern-types.ts';

export function detectInstabilityPatterns(input: PatternInput): PatternDetection[] {
  const results: PatternDetection[] = [];
  const unstableInfra = input.instability.filter(i => i.isUnstableInfrastructure);
  const inversionRisks = input.instability.filter(i => i.hasInversionRisk);
  if (unstableInfra.length > 0) {
    for (const inst of unstableInfra) {
      results.push({
        patternType: 'UNSTABLE_CORE', isAntiPattern: true, severity: inst.instabilityScore >= 0.8 ? 'CRITICAL' : 'HIGH',
        confidence: Math.min(inst.instabilityScore * 1.2, 1), fingerprint: '', title: `Unstable infrastructure: ${inst.nodeId}`,
        summary: `Infrastructure module with instability ${inst.instabilityScore.toFixed(3)} should be stable`,
        impactedNodes: [inst.nodeId], impactedClusters: [],
        topologyEvidence: [], sccEvidence: [], metricEvidence: [{ metricType: 'INSTABILITY', metricValue: inst.instabilityScore, description: `Instability: ${inst.instabilityScore.toFixed(3)}` }],
        metadata: { instabilityScore: inst.instabilityScore, isUnstableInfrastructure: true },
      });
    }
  }
  if (inversionRisks.length > 0) {
    for (const inst of inversionRisks) {
      results.push({
        patternType: 'PROPAGATION_HUB', isAntiPattern: true, severity: 'HIGH', confidence: 0.7,
        fingerprint: '', title: `Dependency inversion risk: ${inst.nodeId}`,
        summary: `Stable module depends on unstable module (instability ${inst.instabilityScore.toFixed(3)})`,
        impactedNodes: [inst.nodeId], impactedClusters: [],
        topologyEvidence: [], sccEvidence: [], metricEvidence: [{ metricType: 'INSTABILITY', metricValue: inst.instabilityScore, description: `Instability: ${inst.instabilityScore.toFixed(3)}` }],
        metadata: { instabilityScore: inst.instabilityScore, hasInversionRisk: true },
      });
    }
  }
  return results;
}
