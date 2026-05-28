import type { InsightCategory, InsightSeverity } from '../types/index.ts';
import { classifySeverity, SEVERITY_THRESHOLDS } from './insight-types.ts';

export interface ClassificationInput {
  category: InsightCategory;
  confidence: number;
  impact: number;
  urgency: number;
  complexity: number;
}

export function classifyInsight(input: ClassificationInput): {
  severity: InsightSeverity;
  overall: number;
} {
  const scores = [
    input.confidence,
    input.impact,
    input.urgency,
    input.complexity,
  ];
  const weights = [0.3, 0.3, 0.25, 0.15] as const;
  const overall = scores.reduce((sum, s, i) => sum + s * (weights[i] ?? 0), 0);
  return {
    severity: classifySeverity(overall),
    overall: Math.min(overall, 1),
  };
}

export function computeConfidence(evidenceCount: number, deterministic: boolean): number {
  let base = Math.min(evidenceCount / 10, 1) * 0.7;
  if (deterministic) base += 0.2;
  return Math.min(base, 1);
}

export function meetsThreshold(score: number, severity: InsightSeverity): boolean {
  return score >= SEVERITY_THRESHOLDS[severity];
}
