import type { CognitionInput } from './cognition-types.ts';

export function generateArchitectureSummary(input: CognitionInput): string {
  const parts: string[] = [];
  parts.push(`System has ${input.couplingDensity.clusterDensities.length} clusters across ${input.complexity.complexityLevel} complexity (${(input.complexity.finalScore * 100).toFixed(0)}/100)`);
  const antiPatterns = input.patterns.filter(p => p.isAntiPattern);
  if (antiPatterns.length > 0) parts.push(`${antiPatterns.length} anti-patterns detected`);
  if (input.risks.length > 0) parts.push(`${input.risks.length} risk correlations identified`);
  if (input.recommendations.length > 0) parts.push(`${input.recommendations.length} recommendations generated`);
  const hotspotSeverities = input.insights.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH');
  if (hotspotSeverities.length > 0) parts.push(`${hotspotSeverities.length} high-severity insights`);
  return parts.join('. ') + '.';
}

export function buildSeverityDistribution(input: CognitionInput): { critical: number; high: number; moderate: number; low: number } {
  const all: string[] = [];
  for (const i of input.insights) all.push(i.severity);
  for (const p of input.patterns) all.push(p.severity);
  for (const r of input.risks) all.push(r.severity);
  for (const r of input.recommendations) all.push(r.severity);
  return {
    critical: all.filter(s => s === 'CRITICAL').length,
    high: all.filter(s => s === 'HIGH').length,
    moderate: all.filter(s => s === 'MODERATE').length,
    low: all.filter(s => s === 'LOW').length,
  };
}

export function computeConfidenceSummary(input: CognitionInput): { overall: number; insightConfidence: number; patternConfidence: number; riskConfidence: number; recommendationConfidence: number } {
  const insightConfidence = input.insights.length > 0 ? Math.min(input.insights.length / 20, 1) : 0;
  const patternConfidence = input.patterns.length > 0 ? input.patterns.reduce((s, p) => s + p.confidence, 0) / input.patterns.length : 0;
  const riskConfidence = input.risks.length > 0 ? input.risks.reduce((s, r) => s + r.normalizedScore, 0) / input.risks.length : 0;
  const recommendationConfidence = input.recommendations.length > 0 ? input.recommendations.reduce((s, r) => s + r.priorityScore, 0) / input.recommendations.length : 0;
  const overall = Math.round((insightConfidence * 0.25 + patternConfidence * 0.25 + riskConfidence * 0.25 + recommendationConfidence * 0.25) * 100) / 100;
  return { overall, insightConfidence: Math.round(insightConfidence * 100) / 100, patternConfidence: Math.round(patternConfidence * 100) / 100, riskConfidence: Math.round(riskConfidence * 100) / 100, recommendationConfidence: Math.round(recommendationConfidence * 100) / 100 };
}

export function identifyCriticalHotspots(input: CognitionInput): { nodeId: string; severity: string; reason: string }[] {
  const nodeMap = new Map<string, { severity: string; reasons: string[] }>();
  for (const insight of input.insights.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH')) {
    for (const ev of insight.evidence) {
      if (ev.nodeId) {
        const existing = nodeMap.get(ev.nodeId) ?? { severity: insight.severity, reasons: [] };
        if (insight.severity === 'CRITICAL') existing.severity = 'CRITICAL';
        existing.reasons.push(insight.title);
        nodeMap.set(ev.nodeId, existing);
      }
    }
  }
  return [...nodeMap.entries()]
    .map(([nodeId, info]) => ({ nodeId, severity: info.severity, reason: [...new Set(info.reasons)].join('; ') }))
    .sort((a, b) => b.severity.localeCompare(a.severity) || a.nodeId.localeCompare(b.nodeId));
}

export function aggregateEvidenceReferences(input: CognitionInput): { source: string; fingerprint: string; description: string }[] {
  const refs: { source: string; fingerprint: string; description: string }[] = [];
  for (const i of input.insights) refs.push({ source: 'insight', fingerprint: i.fingerprint, description: i.title });
  for (const p of input.patterns) refs.push({ source: 'pattern', fingerprint: p.fingerprint, description: p.patternType });
  for (const r of input.risks) refs.push({ source: 'risk', fingerprint: r.fingerprint, description: r.riskType });
  for (const r of input.recommendations) refs.push({ source: 'recommendation', fingerprint: r.fingerprint, description: r.title });
  return refs.sort((a, b) => a.source.localeCompare(b.source) || a.fingerprint.localeCompare(b.fingerprint));
}
