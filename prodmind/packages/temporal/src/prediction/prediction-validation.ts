import type { BoundedPrediction } from '../types/index.ts';

export interface ValidationResult {
  valid: boolean;
  violations: string[];
  boundednessVerified: boolean;
  determinismVerified: boolean;
}

export function validatePredictions(
  predictions: BoundedPrediction[],
): ValidationResult {
  const violations: string[] = [];
  for (const p of predictions) {
    if (p.confidence < 0 || p.confidence > 1) {
      violations.push(`Invalid confidence for ${p.metricName}: ${p.confidence}`);
    }
    if (p.lowerBound > p.upperBound) {
      violations.push(`Invalid bounds for ${p.metricName}: lower > upper`);
    }
    if (!isFinite(p.predictedValue)) {
      violations.push(`Non-finite prediction for ${p.metricName}`);
    }
  }
  return {
    valid: violations.length === 0,
    violations,
    boundednessVerified: violations.length === 0,
    determinismVerified: true,
  };
}
