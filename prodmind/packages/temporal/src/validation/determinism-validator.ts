import type { BoundedPrediction, ForecastResult } from '../types/index.ts';

export interface DeterminismValidationResult {
  deterministic: boolean;
  mismatches: string[];
}

export function validatePredictionDeterminism(
  original: BoundedPrediction,
  replayed: BoundedPrediction,
): DeterminismValidationResult {
  const mismatches: string[] = [];
  if (original.metricName !== replayed.metricName) mismatches.push('metricName mismatch');
  if (original.predictedValue !== replayed.predictedValue) mismatches.push('predictedValue mismatch');
  if (original.confidence !== replayed.confidence) mismatches.push('confidence mismatch');
  if (original.lowerBound !== replayed.lowerBound) mismatches.push('lowerBound mismatch');
  if (original.upperBound !== replayed.upperBound) mismatches.push('upperBound mismatch');
  return { deterministic: mismatches.length === 0, mismatches };
}

export function validateForecastDeterminism(
  original: ForecastResult,
  replayed: ForecastResult,
): DeterminismValidationResult {
  const mismatches: string[] = [];
  if (original.fingerprint !== replayed.fingerprint) mismatches.push('fingerprint mismatch');
  if (original.predictions.length !== replayed.predictions.length) {
    mismatches.push('prediction count mismatch');
    return { deterministic: false, mismatches };
  }
  for (let i = 0; i < original.predictions.length; i++) {
    const result = validatePredictionDeterminism(original.predictions[i]!, replayed.predictions[i]!);
    mismatches.push(...result.mismatches);
  }
  return { deterministic: mismatches.length === 0, mismatches };
}
