import type { BoundedPrediction } from '../types/index.ts';
import type { AuditEntry } from './forecast-audit.ts';

export function auditPrediction(prediction: BoundedPrediction): AuditEntry[] {
  return [
    {
      timestamp: new Date().toISOString(),
      check: `prediction.${prediction.metricName}.boundedness`,
      passed: prediction.lowerBound <= prediction.predictedValue && prediction.predictedValue <= prediction.upperBound,
      details: `Predicted: ${prediction.predictedValue}, Bounds: [${prediction.lowerBound}, ${prediction.upperBound}]`,
    },
    {
      timestamp: new Date().toISOString(),
      check: `prediction.${prediction.metricName}.confidence`,
      passed: prediction.confidence >= 0 && prediction.confidence <= 1,
      details: `Confidence: ${prediction.confidence}`,
    },
    {
      timestamp: new Date().toISOString(),
      check: `prediction.${prediction.metricName}.horizon`,
      passed: prediction.horizonMs >= 0,
      details: `Horizon: ${prediction.horizonMs}ms`,
    },
  ];
}

export function auditPredictions(predictions: BoundedPrediction[]): AuditEntry[] {
  return predictions.flatMap(auditPrediction);
}
