import type { CognitionInput, CognitionSnapshot, CognitionType } from './cognition-types.ts';
import { fingerprintCognition } from './cognition-fingerprint.ts';
import { generateArchitectureSummary, buildSeverityDistribution, computeConfidenceSummary, identifyCriticalHotspots, aggregateEvidenceReferences } from './cognition-summary.ts';
import { computeHealthScore } from './cognition-health-score.ts';

export function aggregateGlobalCognition(input: CognitionInput): CognitionSnapshot {
  return buildSnapshot('GLOBAL', 'All systems', [], input);
}

export function aggregateSubsystemCognition(input: CognitionInput): CognitionSnapshot[] {
  return input.couplingDensity.clusterDensities.map(cluster =>
    buildSnapshot('SUBSYSTEM', cluster.clusterName, [], input),
  );
}

export function aggregateNodeCognition(input: CognitionInput): CognitionSnapshot[] {
  const hotspotNodes = identifyCriticalHotspots(input);
  return hotspotNodes.slice(0, 10).map(hs =>
    buildSnapshot('NODE', hs.nodeId, [hs.nodeId], input),
  );
}

function buildSnapshot(cognitionType: CognitionType, scope: string, targetNodes: string[], input: CognitionInput): CognitionSnapshot {
  const architectureSummary = generateArchitectureSummary(input);
  const dominantRisks = [...input.risks].sort((a, b) => b.normalizedScore - a.normalizedScore).slice(0, 5).map(r => ({ riskType: r.riskType, normalizedScore: r.normalizedScore, severity: r.severity }));
  const dominantPatterns = [...input.patterns].sort((a, b) => b.confidence - a.confidence).slice(0, 5).map(p => ({ patternType: p.patternType, confidence: p.confidence, severity: p.severity }));
  const topRecommendations = [...input.recommendations].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 5).map(r => ({ category: r.category, priority: r.priority, priorityScore: r.priorityScore, title: r.title }));
  const criticalHotspots = identifyCriticalHotspots(input);
  const evidenceReferences = aggregateEvidenceReferences(input);
  const confidenceSummary = computeConfidenceSummary(input);
  const severityDistribution = buildSeverityDistribution(input);
  const healthScore = computeHealthScore(input);
  const fingerprint = fingerprintCognition({ cognitionType, architectureSummary, dominantRisks: dominantRisks.map(r => ({ riskType: r.riskType, normalizedScore: r.normalizedScore })), dominantPatterns: dominantPatterns.map(p => ({ patternType: p.patternType, confidence: p.confidence })), healthScore: healthScore.overall });

  return { cognitionType, fingerprint, architectureSummary, dominantRisks, dominantPatterns, topRecommendations, criticalHotspots, evidenceReferences, confidenceSummary, severityDistribution, healthScore, metadata: { scope, targetNodeCount: targetNodes.length, inputSnapshotId: input.snapshotId } };
}
