import type { RecommendationCategory, RecommendationSeverity } from './recommendation-types.ts';

export interface RecommendationPriorityScore {
  score: number;
  label: 'LOW' | 'MEDIUM' | 'HIGH' | 'IMMEDIATE';
}

function severityToNumeric(severity: RecommendationSeverity): number {
  const map: Record<RecommendationSeverity, number> = { LOW: 1, MODERATE: 2, HIGH: 3, CRITICAL: 4 };
  return map[severity];
}

const CATEGORY_WEIGHTS: Record<RecommendationCategory, number> = {
  REFACTORING: 0.7, DECOUPLING: 0.85, LAYERING: 0.8, MODULARIZATION: 0.75,
  STABILITY: 0.9, PERFORMANCE: 0.6, PROPAGATION_REDUCTION: 0.85,
  COMPLEXITY_REDUCTION: 0.65, DEPENDENCY_ISOLATION: 0.8, BOUNDARY_ENFORCEMENT: 0.75,
};

export function computeRecommendationPriority(
  category: RecommendationCategory,
  severity: RecommendationSeverity,
  propagationRisk?: number,
  instability?: number,
  centrality?: number,
  couplingDensity?: number,
  hotspotConcentration?: number,
  blastRadius?: number,
  repeatedViolations?: number,
): RecommendationPriorityScore {
  const severityWeight = severityToNumeric(severity) / 4;
  const categoryWeight = CATEGORY_WEIGHTS[category];
  const extraFactors = [
    propagationRisk ? propagationRisk * 0.15 : 0,
    instability ? instability * 0.1 : 0,
    centrality ? centrality * 0.1 : 0,
    couplingDensity ? Math.min(couplingDensity, 1) * 0.1 : 0,
    hotspotConcentration ? Math.min(hotspotConcentration, 1) * 0.1 : 0,
    blastRadius ? Math.min(blastRadius, 1) * 0.1 : 0,
    repeatedViolations ? Math.min(repeatedViolations / 10, 1) * 0.05 : 0,
  ].reduce((a, b) => a + b, 0);
  const score = Math.round(Math.min(severityWeight * 0.4 + categoryWeight * 0.3 + extraFactors, 1) * 100) / 100;
  let label: 'LOW' | 'MEDIUM' | 'HIGH' | 'IMMEDIATE';
  if (score >= 0.8) label = 'IMMEDIATE';
  else if (score >= 0.6) label = 'HIGH';
  else if (score >= 0.4) label = 'MEDIUM';
  else label = 'LOW';
  return { score, label };
}
