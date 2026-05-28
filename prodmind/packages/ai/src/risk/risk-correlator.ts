import type { RiskCorrelation, RiskInput, RiskType, RiskSeverity } from './risk-types.ts';
import { fingerprintRisk } from './risk-fingerprint.ts';
import { computeNormalizedRiskScore } from './risk-scoring.ts';

export function correlateRisks(input: RiskInput): RiskCorrelation[] {
  const results: RiskCorrelation[] = [];
  results.push(...correlateArchitecturalCollapse(input));
  results.push(...correlateCascadeFailure(input));
  results.push(...correlateMaintainability(input));
  results.push(...correlateChangeAmplification(input));
  results.push(...correlateCoupling(input));
  results.push(...correlateStability(input));
  results.push(...correlateComplexity(input));
  results.push(...correlateFragmentation(input));
  results.push(...correlateScalability(input));
  results.push(...correlateEvolution(input));
  return results;
}

function correlateArchitecturalCollapse(input: RiskInput): RiskCorrelation[] {
  const results: RiskCorrelation[] = [];
  const criticalPatterns = input.patterns.filter(p => p.severity === 'CRITICAL' && p.isAntiPattern);
  const criticalInsights = input.insights.filter(i => i.severity === 'CRITICAL');
  const highInstability = input.instability.filter(i => i.instabilityScore > 0.7);
  const highPropagation = input.propagationRisk.filter(p => p.propagationPressure > 0.7);
  const overlapNodes = findOverlappingNodes(criticalPatterns, criticalInsights, highInstability, highPropagation);
  if (overlapNodes.length > 0 && criticalPatterns.length >= 2) {
    const severity: RiskSeverity = 'CRITICAL';
    const score = computeNormalizedRiskScore({ severity, propagationDepth: Math.max(...highPropagation.map(p => p.cascadeEstimate), 0), couplingDensity: input.couplingDensity.globalDensity, sccCentrality: input.complexity.sccDensity, instability: Math.max(...highInstability.map(i => i.instabilityScore), 0), blastRadius: Math.max(...highPropagation.map(p => p.blastRadiusAmplification), 0), architectureDepth: input.complexity.depthScore, ruleRecurrenceFrequency: criticalInsights.length });
    results.push(buildRisk('ARCHITECTURAL_COLLAPSE_RISK', severity, score, 'Architectural collapse risk detected', `Multiple critical anti-patterns (${criticalPatterns.length}) and insights (${criticalInsights.length}) overlap across ${overlapNodes.length} nodes`, overlapNodes, criticalInsights.map(i => i.fingerprint), criticalPatterns.map(p => p.fingerprint)));
  }
  return results;
}

function correlateCascadeFailure(input: RiskInput): RiskCorrelation[] {
  const results: RiskCorrelation[] = [];
  const chokePoints = input.propagationRisk.filter(p => p.isChokePoint);
  const highPropagation = input.propagationRisk.filter(p => p.propagationPressure >= 0.5);
  if (chokePoints.length > 0) {
    const maxCascade = Math.max(...chokePoints.map(c => c.cascadeEstimate), 0);
    const severity: RiskSeverity = maxCascade > 10 ? 'CRITICAL' : maxCascade > 5 ? 'HIGH' : 'MODERATE';
    const score = computeNormalizedRiskScore({ severity, propagationDepth: maxCascade, couplingDensity: input.couplingDensity.globalDensity, sccCentrality: input.complexity.sccDensity, instability: 0, blastRadius: Math.max(...chokePoints.map(c => c.blastRadiusAmplification), 0), architectureDepth: input.complexity.depthScore, ruleRecurrenceFrequency: highPropagation.length });
    results.push(buildRisk('CASCADE_FAILURE_RISK', severity, score, 'Cascade failure risk detected', `${chokePoints.length} choke points with max cascade estimate ${maxCascade.toFixed(3)}`, chokePoints.map(c => c.nodeId), [], []));
  }
  return results;
}

function correlateMaintainability(input: RiskInput): RiskCorrelation[] {
  const results: RiskCorrelation[] = [];
  const godModules = input.patterns.filter(p => p.patternType === 'GOD_MODULE');
  const complexInsights = input.insights.filter(i => ['COMPLEXITY', 'HOTSPOT', 'COUPLING'].includes(i.type));
  const highComplexity = input.complexity.finalScore > 0.5;
  if (godModules.length > 0 || (complexInsights.length > 3 && highComplexity)) {
    const severity: RiskSeverity = input.complexity.finalScore > 0.8 ? 'CRITICAL' : input.complexity.finalScore > 0.5 ? 'HIGH' : 'MODERATE';
    const impactedNodes = [...new Set([...godModules.flatMap(g => g.impactedNodes), ...complexInsights.flatMap(i => i.evidence.filter(e => e.nodeId).map(e => e.nodeId!))])];
    const score = computeNormalizedRiskScore({ severity, propagationDepth: input.complexity.depthScore, couplingDensity: input.couplingDensity.globalDensity, sccCentrality: input.complexity.sccDensity, instability: 0, blastRadius: input.couplingDensity.globalDensity, architectureDepth: input.complexity.depthScore, ruleRecurrenceFrequency: complexInsights.length });
    results.push(buildRisk('MAINTAINABILITY_RISK', severity, score, 'Maintainability risk detected', `Complexity ${input.complexity.finalScore.toFixed(3)} with ${godModules.length} god modules`, impactedNodes, complexInsights.map(i => i.fingerprint), godModules.map(g => g.fingerprint)));
  }
  return results;
}

function correlateChangeAmplification(input: RiskInput): RiskCorrelation[] {
  const results: RiskCorrelation[] = [];
  const highFanOut = input.fanMetrics.filter(f => f.fanOut > 20);
  const propagationRisk = input.propagationRisk.filter(p => p.propagationPressure > 0.5);
  const highCentrality = input.centrality.filter(c => c.dependencyInfluenceScore > 0.5);
  if (highFanOut.length > 0 || propagationRisk.length > 0) {
    const impactedNodes = [...new Set([...highFanOut.map(f => f.nodeId), ...propagationRisk.map(p => p.nodeId), ...highCentrality.map(c => c.nodeId)])];
    const severity: RiskSeverity = impactedNodes.length > 5 ? 'CRITICAL' : impactedNodes.length > 3 ? 'HIGH' : 'MODERATE';
    const score = computeNormalizedRiskScore({ severity, propagationDepth: Math.max(...propagationRisk.map(p => p.cascadeEstimate), 0), couplingDensity: input.couplingDensity.globalDensity, sccCentrality: input.complexity.sccDensity, instability: 0, blastRadius: Math.max(...propagationRisk.map(p => p.blastRadiusAmplification), 0), architectureDepth: input.complexity.depthScore, ruleRecurrenceFrequency: propagationRisk.length });
    results.push(buildRisk('CHANGE_AMPLIFICATION_RISK', severity, score, 'Change amplification risk detected', `${impactedNodes.length} nodes amplify change propagation across the system`, impactedNodes, [], []));
  }
  return results;
}

function correlateCoupling(input: RiskInput): RiskCorrelation[] {
  const results: RiskCorrelation[] = [];
  const highDensity = input.couplingDensity.globalDensity > 0.1;
  const highClusterDensity = input.couplingDensity.clusterDensities.filter(c => c.density > 0.2);
  const couplingInsights = input.insights.filter(i => i.type === 'COUPLING');
  if (highDensity || highClusterDensity.length > 0 || couplingInsights.length > 0) {
    const severity: RiskSeverity = input.couplingDensity.globalDensity > 0.2 ? 'CRITICAL' : input.couplingDensity.globalDensity > 0.1 ? 'HIGH' : 'MODERATE';
    const score = computeNormalizedRiskScore({ severity, propagationDepth: 0, couplingDensity: input.couplingDensity.globalDensity, sccCentrality: input.complexity.sccDensity, instability: 0, blastRadius: input.couplingDensity.edgeConcentration, architectureDepth: 0, ruleRecurrenceFrequency: couplingInsights.length });
    results.push(buildRisk('COUPLING_RISK', severity, score, 'Coupling risk detected', `Global coupling density ${input.couplingDensity.globalDensity.toFixed(4)} with ${highClusterDensity.length} high-density clusters`, [], couplingInsights.map(i => i.fingerprint), []));
  }
  return results;
}

function correlateStability(input: RiskInput): RiskCorrelation[] {
  const results: RiskCorrelation[] = [];
  const unstableNodes = input.instability.filter(i => i.instabilityScore >= 0.5);
  const inversionRisks = input.instability.filter(i => i.hasInversionRisk);
  const instabilityPatterns = input.patterns.filter(p => p.patternType === 'UNSTABLE_CORE');
  if (unstableNodes.length > 0 || inversionRisks.length > 0) {
    const impactedNodes = [...new Set([...unstableNodes.map(u => u.nodeId), ...inversionRisks.map(i => i.nodeId)])];
    const maxInstability = Math.max(...unstableNodes.map(u => u.instabilityScore), 0);
    const severity: RiskSeverity = maxInstability >= 0.8 ? 'CRITICAL' : maxInstability >= 0.5 ? 'HIGH' : 'MODERATE';
    const score = computeNormalizedRiskScore({ severity, propagationDepth: 0, couplingDensity: 0, sccCentrality: 0, instability: maxInstability, blastRadius: 0, architectureDepth: 0, ruleRecurrenceFrequency: inversionRisks.length });
    results.push(buildRisk('STABILITY_RISK', severity, score, 'Stability risk detected', `${unstableNodes.length} unstable modules, ${inversionRisks.length} with dependency inversion risk`, impactedNodes, [], instabilityPatterns.map(p => p.fingerprint)));
  }
  return results;
}

function correlateComplexity(input: RiskInput): RiskCorrelation[] {
  const results: RiskCorrelation[] = [];
  const { complexity } = input;
  if (complexity.finalScore > 0.3) {
    const severity: RiskSeverity = complexity.finalScore > 0.8 ? 'CRITICAL' : complexity.finalScore > 0.5 ? 'HIGH' : 'MODERATE';
    const score = computeNormalizedRiskScore({ severity, propagationDepth: complexity.depthScore, couplingDensity: input.couplingDensity.globalDensity, sccCentrality: complexity.sccDensity, instability: 0, blastRadius: complexity.edgeNodeRatio, architectureDepth: complexity.depthScore, ruleRecurrenceFrequency: 0 });
    results.push(buildRisk('COMPLEXITY_RISK', severity, score, 'Complexity risk detected', `System complexity ${complexity.finalScore.toFixed(3)} (${complexity.complexityLevel})`, [], [], []));
  }
  return results;
}

function correlateFragmentation(input: RiskInput): RiskCorrelation[] {
  const results: RiskCorrelation[] = [];
  const clusters = input.couplingDensity.clusterDensities;
  const lowCohesion = clusters.filter(c => c.density <= 0.05);
  if (lowCohesion.length > 3 && clusters.length > 5) {
    const severity: RiskSeverity = input.complexity.fragmentationScore > 0.7 ? 'CRITICAL' : input.complexity.fragmentationScore > 0.5 ? 'HIGH' : 'MODERATE';
    const score = computeNormalizedRiskScore({ severity, propagationDepth: 0, couplingDensity: input.couplingDensity.globalDensity, sccCentrality: input.complexity.sccDensity, instability: 0, blastRadius: input.complexity.fragmentationScore, architectureDepth: 0, ruleRecurrenceFrequency: 0 });
    results.push(buildRisk('FRAGMENTATION_RISK', severity, score, 'Fragmentation risk detected', `${lowCohesion.length}/${clusters.length} clusters have low cohesion (≤ 0.05)`, [], [], []));
  }
  return results;
}

function correlateScalability(input: RiskInput): RiskCorrelation[] {
  const results: RiskCorrelation[] = [];
  const propagationChokePoints = input.propagationRisk.filter(p => p.isChokePoint);
  const highCentrality = input.centrality.filter(c => c.dependencyInfluenceScore > 0.7);
  if (propagationChokePoints.length > 3 || (highCentrality.length > 2 && input.couplingDensity.globalDensity > 0.1)) {
    const severity: RiskSeverity = propagationChokePoints.length > 5 ? 'CRITICAL' : 'HIGH';
    const score = computeNormalizedRiskScore({ severity, propagationDepth: Math.max(...propagationChokePoints.map(p => p.cascadeEstimate), 0), couplingDensity: input.couplingDensity.globalDensity, sccCentrality: input.complexity.sccDensity, instability: 0, blastRadius: Math.max(...propagationChokePoints.map(p => p.blastRadiusAmplification), 0), architectureDepth: input.complexity.depthScore, ruleRecurrenceFrequency: propagationChokePoints.length });
    results.push(buildRisk('SCALABILITY_RISK', severity, score, 'Scalability risk detected', `${propagationChokePoints.length} choke points limit scalability`, [...propagationChokePoints.map(p => p.nodeId), ...highCentrality.map(c => c.nodeId)], [], []));
  }
  return results;
}

function correlateEvolution(input: RiskInput): RiskCorrelation[] {
  const results: RiskCorrelation[] = [];
  const highCoupling = input.couplingDensity.globalDensity > 0.1;
  const highComplexity = input.complexity.finalScore > 0.5;
  const manyAntiPatterns = input.patterns.filter(p => p.isAntiPattern).length > 3;
  if (highCoupling || highComplexity || manyAntiPatterns) {
    const severity: RiskSeverity = (highCoupling && highComplexity && manyAntiPatterns) ? 'CRITICAL' : (highCoupling || highComplexity) ? 'HIGH' : 'MODERATE';
    const antiPatterns = input.patterns.filter(p => p.isAntiPattern);
    const score = computeNormalizedRiskScore({ severity, propagationDepth: input.complexity.depthScore, couplingDensity: input.couplingDensity.globalDensity, sccCentrality: input.complexity.sccDensity, instability: 0, blastRadius: input.complexity.fragmentationScore, architectureDepth: input.complexity.depthScore, ruleRecurrenceFrequency: antiPatterns.length });
    results.push(buildRisk('EVOLUTION_RISK', severity, score, 'Evolution risk detected', `System evolution constrained by coupling=${input.couplingDensity.globalDensity.toFixed(3)}, complexity=${input.complexity.finalScore.toFixed(3)}, ${antiPatterns.length} anti-patterns`, [], [], antiPatterns.map(p => p.fingerprint)));
  }
  return results;
}

type OverlapItem = ({ impactedNodes?: string[]; evidence?: { nodeId?: string }[] } | { nodeId: string });

function findOverlappingNodes(...groups: OverlapItem[][]): string[] {
  const nodeSets = groups.map(g => {
    const nodes: string[] = [];
    for (const item of g) {
      if ('nodeId' in item && !('impactedNodes' in item)) { nodes.push(item.nodeId); }
      if ('impactedNodes' in item && item.impactedNodes) nodes.push(...item.impactedNodes);
      if ('evidence' in item && item.evidence) nodes.push(...item.evidence.filter(e => e.nodeId).map(e => e.nodeId!));
    }
    return new Set(nodes);
  }).filter(s => s.size > 0);
  if (nodeSets.length === 0) return [];
  const overlap = [...nodeSets.reduce((acc, set) => {
    if (acc.size === 0) return new Set(set);
    return new Set([...acc].filter(x => set.has(x)));
  }, new Set<string>())];
  return overlap;
}

function buildRisk(riskType: RiskType, severity: RiskSeverity, normalizedScore: number, title: string, summary: string, impactedNodes: string[], insightFps: string[], patternFps: string[]): RiskCorrelation {
  const fingerprint = fingerprintRisk({ riskType, severity, normalizedScore, title, impactedNodes, insightFingerprints: insightFps, patternFingerprints: patternFps });
  return { riskType, severity, normalizedScore, fingerprint, title, summary, impactedNodes, impactedSubsystems: [], insightFingerprints: insightFps, patternFingerprints: patternFps, evidenceRefs: [], metadata: { insightCount: insightFps.length, patternCount: patternFps.length, impactedNodeCount: impactedNodes.length } };
}
