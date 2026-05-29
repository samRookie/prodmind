import type { BoundedPrediction } from '../types/index.ts';

export interface PredictionValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePrediction(prediction: BoundedPrediction): PredictionValidationResult {
  const errors: string[] = [];
  if (!prediction.metricName) errors.push('Missing metricName');
  if (!isFinite(prediction.predictedValue)) errors.push('Non-finite predictedValue');
  if (!isFinite(prediction.currentValue)) errors.push('Non-finite currentValue');
  if (!isFinite(prediction.lowerBound)) errors.push('Non-finite lowerBound');
  if (!isFinite(prediction.upperBound)) errors.push('Non-finite upperBound');
  if (prediction.lowerBound > prediction.upperBound) errors.push('lowerBound exceeds upperBound');
  if (prediction.confidence < 0 || prediction.confidence > 1) errors.push('Confidence out of [0,1]');
  if (prediction.horizonMs < 0) errors.push('Negative horizonMs');
  return { valid: errors.length === 0, errors };
}

export function validatePredictions(predictions: BoundedPrediction[]): PredictionValidationResult[] {
  return predictions.map(validatePrediction);
}
