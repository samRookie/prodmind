import type { InsightSeverity, InsightCategory, InsightScope } from './insight-types.ts';
import { severityToNumeric } from './insight-classifier.ts';

export interface PriorityScore {
  score: number;
  label: string;
}

const CATEGORY_WEIGHTS: Record<InsightCategory, number> = {
  HOTSPOT: 0.9,
  INSTABILITY: 0.8,
  DEPTH: 0.6,
  PROPAGATION: 0.85,
  COUPLING: 0.75,
  ARCHITECTURE: 0.95,
  COMPLEXITY: 0.7,
  FRAGMENTATION: 0.65,
};

const SCOPE_WEIGHTS: Record<InsightScope, number> = {
  GLOBAL: 1.0,
  CLUSTER: 0.8,
  NODE: 0.6,
  EDGE: 0.5,
};

export function computePriorityScore(
  category: InsightCategory,
  severity: InsightSeverity,
  scope: InsightScope,
): PriorityScore {
  const severityWeight = severityToNumeric(severity) / 4;
  const categoryWeight = CATEGORY_WEIGHTS[category];
  const scopeWeight = SCOPE_WEIGHTS[scope];

  const score = Math.round((severityWeight * 0.5 + categoryWeight * 0.3 + scopeWeight * 0.2) * 100) / 100;

  let label: string;
  if (score >= 0.8) label = 'IMMEDIATE';
  else if (score >= 0.6) label = 'HIGH';
  else if (score >= 0.4) label = 'MEDIUM';
  else label = 'LOW';

  return { score, label };
}

export function sortByPriority(insights: { priority: PriorityScore }[]): { priority: PriorityScore }[] {
  return [...insights].sort((a, b) => b.priority.score - a.priority.score);
}
