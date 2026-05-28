import type { CognitionInput, HealthScoreDetails } from './cognition-types.ts';

export function computeHealthScore(input: CognitionInput): HealthScoreDetails {
  const complexity = Math.min(input.complexity.finalScore, 1);
  const instability = input.instability.length > 0 ? Math.min(Math.max(...input.instability.map(i => i.instabilityScore), 0), 1) : 0;
  const propagationRisk = input.propagationRisk.length > 0 ? Math.min(Math.max(...input.propagationRisk.map(p => p.propagationPressure), 0), 1) : 0;
  const sccDensity = Math.min(input.complexity.sccDensity, 1);
  const fragmentation = Math.min(input.complexity.fragmentationScore, 1);
  const antiPatternCount = input.patterns.filter(p => p.isAntiPattern).length;
  const antiPatternDensity = Math.min(antiPatternCount / Math.max(input.patterns.length, 1), 1);
  const recSeverity = input.recommendations.length > 0 ? Math.min(Math.max(...input.recommendations.map(r => r.severity === 'CRITICAL' ? 1 : r.severity === 'HIGH' ? 0.75 : r.severity === 'MODERATE' ? 0.5 : 0.25), 0), 1) : 0;
  const architectureDepth = Math.min(input.complexity.depthScore, 1);

  const rawScore = 1 - (
    complexity * 0.2 +
    instability * 0.15 +
    propagationRisk * 0.15 +
    sccDensity * 0.1 +
    fragmentation * 0.1 +
    antiPatternDensity * 0.1 +
    recSeverity * 0.1 +
    architectureDepth * 0.1
  );

  const overall = Math.round(Math.max(0, Math.min(rawScore, 1)) * 1000) / 1000;
  let label: string;
  if (overall >= 0.8) label = 'HEALTHY';
  else if (overall >= 0.6) label = 'MODERATE';
  else if (overall >= 0.4) label = 'AT_RISK';
  else label = 'CRITICAL';

  return { overall, label, complexity, instability, propagationRisk, sccDensity, fragmentation, antiPatternDensity, recommendationSeverity: recSeverity, architectureDepth };
}
