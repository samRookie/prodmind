import type { ForecastResult } from '../types/index.ts';

export interface ForecastValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateForecast(forecast: ForecastResult): ForecastValidationResult {
  const errors: string[] = [];
  if (!forecast.id) errors.push('Missing forecast id');
  if (!forecast.projectId) errors.push('Missing project id');
  if (!forecast.createdAt) errors.push('Missing createdAt');
  if (forecast.predictions.length === 0) errors.push('No predictions in forecast');
  if (forecast.confidence < 0 || forecast.confidence > 1) errors.push('Confidence out of range');
  for (const p of forecast.predictions) {
    if (!isFinite(p.predictedValue)) errors.push(`Non-finite prediction for ${p.metricName}`);
    if (p.lowerBound > p.upperBound) errors.push(`Invalid bounds for ${p.metricName}`);
  }
  return { valid: errors.length === 0, errors };
}
