import type { NarrativeInput, NarrativeOutput, NarrativeType, NarrativeSeverity } from './narrative-types.ts';
import { buildNarrative } from './narrative-builder.ts';
import { buildSection } from './narrative-sections.ts';
import { aggregateNarrativeEvidence, computeNarrativeSeverityDistribution, collectImpactedSystems } from './narrative-evidence.ts';
import { rankNarrativesBySeverity } from './narrative-priority.ts';
import { renderArchitectureSummary, collectArchitectureMetrics, collectArchitectureImpactedSystems } from './templates/architecture-summary.ts';
import { renderHotspotSummary, collectHotspotMetrics, collectHotspotImpactedSystems } from './templates/hotspot-summary.ts';
import { renderPropagationSummary, collectPropagationMetrics, collectPropagationImpactedSystems } from './templates/propagation-summary.ts';
import { renderRiskSummary, collectRiskMetrics, collectRiskImpactedSystems } from './templates/risk-summary.ts';
import { renderRecommendationSummary, collectRecommendationMetrics, collectRecommendationImpactedSystems } from './templates/recommendation-summary.ts';
import { renderCognitionSummary, collectCognitionMetrics, collectCognitionImpactedSystems } from './templates/cognition-summary.ts';
import { renderStabilitySummary, collectStabilityMetrics, collectStabilityImpactedSystems } from './templates/stability-summary.ts';

interface NarrativeTemplate {
  narrativeType: NarrativeType;
  render: (input: NarrativeInput) => string;
  collectMetrics: (input: NarrativeInput) => { metricType: string; metricValue: number }[];
  collectImpacted: (input: NarrativeInput) => string[];
}

const NARRATIVE_TEMPLATES: Record<NarrativeType, NarrativeTemplate> = {
  GLOBAL_ARCHITECTURE_SUMMARY: {
    narrativeType: 'GLOBAL_ARCHITECTURE_SUMMARY',
    render: renderArchitectureSummary,
    collectMetrics: collectArchitectureMetrics,
    collectImpacted: collectArchitectureImpactedSystems,
  },
  HOTSPOT_SUMMARY: {
    narrativeType: 'HOTSPOT_SUMMARY',
    render: renderHotspotSummary,
    collectMetrics: collectHotspotMetrics,
    collectImpacted: collectHotspotImpactedSystems,
  },
  PROPAGATION_SUMMARY: {
    narrativeType: 'PROPAGATION_SUMMARY',
    render: renderPropagationSummary,
    collectMetrics: collectPropagationMetrics,
    collectImpacted: collectPropagationImpactedSystems,
  },
  RISK_SUMMARY: {
    narrativeType: 'RISK_SUMMARY',
    render: renderRiskSummary,
    collectMetrics: collectRiskMetrics,
    collectImpacted: collectRiskImpactedSystems,
  },
  RECOMMENDATION_SUMMARY: {
    narrativeType: 'RECOMMENDATION_SUMMARY',
    render: renderRecommendationSummary,
    collectMetrics: collectRecommendationMetrics,
    collectImpacted: collectRecommendationImpactedSystems,
  },
  COGNITION_SUMMARY: {
    narrativeType: 'COGNITION_SUMMARY',
    render: renderCognitionSummary,
    collectMetrics: collectCognitionMetrics,
    collectImpacted: collectCognitionImpactedSystems,
  },
  STABILITY_SUMMARY: {
    narrativeType: 'STABILITY_SUMMARY',
    render: renderStabilitySummary,
    collectMetrics: collectStabilityMetrics,
    collectImpacted: collectStabilityImpactedSystems,
  },
  COMPLEXITY_SUMMARY: {
    narrativeType: 'COMPLEXITY_SUMMARY',
    render: (input) => `Complexity level: ${input.complexity.complexityLevel} (${(input.complexity.finalScore * 100).toFixed(0)}/100). Fragmentation: ${(input.complexity.fragmentationScore * 100).toFixed(0)}/100.`,
    collectMetrics: (input) => [{ metricType: 'COMPLEXITY_SCORE', metricValue: input.complexity.finalScore }, { metricType: 'FRAGMENTATION_SCORE', metricValue: input.complexity.fragmentationScore }],
    collectImpacted: () => [],
  },
  EXECUTIVE_SUMMARY: {
    narrativeType: 'EXECUTIVE_SUMMARY',
    render: (input) => {
      const globalSnap = input.cognitionSnapshots.find(c => c.cognitionType === 'GLOBAL');
      const parts: string[] = [];
      if (globalSnap) parts.push(`Architecture health: ${(globalSnap.healthScore.overall * 100).toFixed(0)}/100 (${globalSnap.healthScore.label})`);
      parts.push(`Clusters: ${input.couplingDensity.clusterDensities.length}`);
      const criticalPatterns = input.patterns.filter(p => p.isAntiPattern && p.severity === 'CRITICAL');
      if (criticalPatterns.length > 0) parts.push(`Critical anti-patterns: ${criticalPatterns.length}`);
      const criticalRisks = input.risks.filter(r => r.severity === 'CRITICAL');
      if (criticalRisks.length > 0) parts.push(`Critical risks: ${criticalRisks.length}`);
      if (input.recommendations.length > 0) parts.push(`Recommendations: ${input.recommendations.length}`);
      return parts.join('. ') + '.';
    },
    collectMetrics: (input) => {
      const globalSnap = input.cognitionSnapshots.find(c => c.cognitionType === 'GLOBAL');
      return [
        { metricType: 'HEALTH_SCORE', metricValue: globalSnap?.healthScore.overall ?? 0 },
        { metricType: 'CLUSTER_COUNT', metricValue: input.couplingDensity.clusterDensities.length },
        { metricType: 'TOTAL_ANTI_PATTERNS', metricValue: input.patterns.filter(p => p.isAntiPattern).length },
        { metricType: 'TOTAL_RISKS', metricValue: input.risks.length },
        { metricType: 'TOTAL_RECOMMENDATIONS', metricValue: input.recommendations.length },
      ].sort((a, b) => a.metricType.localeCompare(b.metricType));
    },
    collectImpacted: (input) => {
      const systems = new Set<string>();
      for (const p of input.patterns) for (const n of p.impactedNodes) systems.add(n);
      for (const r of input.risks) for (const n of r.impactedNodes) systems.add(n);
      return [...systems].sort();
    },
  },
  SUBSYSTEM_SUMMARY: {
    narrativeType: 'SUBSYSTEM_SUMMARY',
    render: (input) => {
      const clusterDensities = input.couplingDensity.clusterDensities;
      if (clusterDensities.length === 0) return 'No subsystems identified.';
      const parts: string[] = [];
      parts.push(`${clusterDensities.length} subsystems`);
      const denseClusters = clusterDensities.filter(c => c.density >= 0.2);
      if (denseClusters.length > 0) parts.push(`${denseClusters.length} with high internal coupling`);
      const sparseClusters = clusterDensities.filter(c => c.density <= 0.05);
      if (sparseClusters.length > 0) parts.push(`${sparseClusters.length} with low cohesion`);
      return parts.join('. ') + '.';
    },
    collectMetrics: (input) => {
      const clusterDensities = input.couplingDensity.clusterDensities;
      return [
        { metricType: 'SUBSYSTEM_COUNT', metricValue: clusterDensities.length },
        { metricType: 'HIGH_COUPLING_SUBSYSTEMS', metricValue: clusterDensities.filter(c => c.density >= 0.2).length },
        { metricType: 'LOW_COHESION_SUBSYSTEMS', metricValue: clusterDensities.filter(c => c.density <= 0.05).length },
      ].sort((a, b) => a.metricType.localeCompare(b.metricType));
    },
    collectImpacted: (input) => input.couplingDensity.clusterDensities.map(c => c.clusterName).sort(),
  },
};

function computeNarrativeSeverity(input: NarrativeInput, narrativeType: NarrativeType): NarrativeSeverity {
  let maxSeverity = 0;
  const severityMap: Record<string, number> = { LOW: 1, MODERATE: 2, HIGH: 3, CRITICAL: 4 };

  for (const p of input.patterns) {
    if (p.isAntiPattern) maxSeverity = Math.max(maxSeverity, severityMap[p.severity] ?? 0);
  }
  for (const r of input.risks) {
    maxSeverity = Math.max(maxSeverity, severityMap[r.severity] ?? 0);
  }

  if (narrativeType === 'EXECUTIVE_SUMMARY') {
    for (const c of input.cognitionSnapshots) {
      if (c.healthScore.label === 'CRITICAL') maxSeverity = Math.max(maxSeverity, 4);
      else if (c.healthScore.label === 'AT_RISK') maxSeverity = Math.max(maxSeverity, 3);
    }
  }

  const severityEntries = Object.entries(severityMap);
  const matched = severityEntries.filter(([, v]) => v <= maxSeverity);
  return (matched.length > 0 ? matched[matched.length - 1][0] : 'LOW') as NarrativeSeverity;
}

export class NarrativeEngine {
  analyze(input: NarrativeInput, types?: NarrativeType[]): NarrativeOutput {
    const requested = types ?? (Object.keys(NARRATIVE_TEMPLATES) as NarrativeType[]);
    const allEvidence = aggregateNarrativeEvidence(input);
    const severityDistribution = computeNarrativeSeverityDistribution(input);
    const allSystems = collectImpactedSystems(input);

    const narratives = requested
      .filter(t => t in NARRATIVE_TEMPLATES)
      .map((narrativeType) => {
        const template = NARRATIVE_TEMPLATES[narrativeType];
        const summary = template.render(input);
        const metrics = template.collectMetrics(input);
        const impacted = template.collectImpacted(input);
        const severity = computeNarrativeSeverity(input, narrativeType);

        const section = buildSection({
          title: template.narrativeType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
          content: summary, severity,
          evidenceRefs: allEvidence.filter(e => impacted.length === 0 || impacted.some(s => e.description.includes(s))),
          metrics, impactedNodes: impacted,
        });

        return buildNarrative({
          narrativeType, severity, title: template.narrativeType.replace(/_/g, ' '),
          summary, sections: [section],
          evidenceRefs: allEvidence,
          impactedSystems: impacted.length > 0 ? impacted : allSystems,
          severityDistribution,
          metadata: { snapshotId: input.snapshotId, sectionCount: 1 },
        });
      });

    return {
      snapshotId: input.snapshotId,
      narratives: rankNarrativesBySeverity(narratives),
      generatedAt: new Date().toISOString(),
    };
  }
}
