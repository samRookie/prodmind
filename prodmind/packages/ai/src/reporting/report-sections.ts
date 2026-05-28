import type { ReportSection } from './reporting-types.ts';

export function buildArchitectureSummarySection(snapshot: { architectureSummary: string; healthScore: { overall: number; label: string } }): ReportSection {
  return {
    title: 'Architecture Summary',
    content: `${snapshot.architectureSummary}. Health score: ${(snapshot.healthScore.overall * 100).toFixed(0)}/100 (${snapshot.healthScore.label})`,
    severity: snapshot.healthScore.label === 'CRITICAL' ? 'CRITICAL' : snapshot.healthScore.label === 'AT_RISK' ? 'HIGH' : 'MODERATE',
    metrics: [{ metricType: 'HEALTH_SCORE', metricValue: snapshot.healthScore.overall }],
    impactedNodes: [],
  };
}

export function buildRiskSummarySection(risks: { riskType: string; severity: string; normalizedScore: number; title: string }[]): ReportSection {
  const criticalRisks = risks.filter(r => r.severity === 'CRITICAL');
  const topRisk = risks.sort((a, b) => b.normalizedScore - a.normalizedScore)[0];
  const content = `Total risks: ${risks.length}. Critical: ${criticalRisks.length}. Highest: ${topRisk ? `${topRisk.riskType} (${(topRisk.normalizedScore * 100).toFixed(0)}/100)` : 'none'}`;
  return {
    title: 'Risk Summary',
    content,
    severity: criticalRisks.length > 0 ? 'CRITICAL' : risks.length > 0 ? 'HIGH' : 'LOW',
    metrics: [
      { metricType: 'TOTAL_RISKS', metricValue: risks.length },
      { metricType: 'CRITICAL_RISKS', metricValue: criticalRisks.length },
    ],
    impactedNodes: [],
  };
}

export function buildPatternSummarySection(patterns: { patternType: string; severity: string; title: string }[]): ReportSection {
  const antiPatterns = patterns;
  const criticalCount = antiPatterns.filter(p => p.severity === 'CRITICAL').length;
  const content = `Total patterns: ${antiPatterns.length}. Critical: ${criticalCount}.`;
  return {
    title: 'Architecture Patterns',
    content,
    severity: criticalCount > 0 ? 'CRITICAL' : antiPatterns.length > 0 ? 'HIGH' : 'LOW',
    metrics: [
      { metricType: 'TOTAL_PATTERNS', metricValue: antiPatterns.length },
      { metricType: 'CRITICAL_PATTERNS', metricValue: criticalCount },
    ],
    impactedNodes: [],
  };
}

export function buildHotspotSection(hotspots: { nodeId: string; severity: string; reason: string }[]): ReportSection {
  const criticalHotspots = hotspots.filter(h => h.severity === 'CRITICAL');
  const content = hotspots.length > 0 ? `Hotspots: ${hotspots.length}. Critical: ${criticalHotspots.length}.` : 'No hotspots identified.';
  return {
    title: 'Critical Hotspots',
    content,
    severity: criticalHotspots.length > 0 ? 'CRITICAL' : hotspots.length > 0 ? 'HIGH' : 'LOW',
    metrics: [
      { metricType: 'TOTAL_HOTSPOTS', metricValue: hotspots.length },
      { metricType: 'CRITICAL_HOTSPOTS', metricValue: criticalHotspots.length },
    ],
    impactedNodes: hotspots.map(h => h.nodeId).sort(),
  };
}

export function buildRecommendationSection(recommendations: { category: string; priority: string; title: string }[]): ReportSection {
  const immediate = recommendations.filter(r => r.priority === 'IMMEDIATE');
  const content = `Recommendations: ${recommendations.length}. Immediate: ${immediate.length}.`;
  return {
    title: 'Recommendations',
    content,
    severity: immediate.length > 0 ? 'CRITICAL' : recommendations.length > 0 ? 'HIGH' : 'LOW',
    metrics: [
      { metricType: 'TOTAL_RECOMMENDATIONS', metricValue: recommendations.length },
      { metricType: 'IMMEDIATE_RECOMMENDATIONS', metricValue: immediate.length },
    ],
    impactedNodes: [],
  };
}
