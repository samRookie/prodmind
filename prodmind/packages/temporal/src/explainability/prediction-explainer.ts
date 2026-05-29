import type { BoundedPrediction } from '../types/index.ts';

export interface PredictionExplanation {
  summary: string;
  highConfidence: string[];
  lowConfidence: string[];
  riskWarnings: string[];
}

export function explainPredictions(predictions: BoundedPrediction[]): PredictionExplanation {
  const highConfidence = predictions
    .filter((p) => p.confidence >= 0.7)
    .map((p) => `${p.metricName}: ${p.currentValue.toFixed(2)} -> ${p.predictedValue.toFixed(2)}`);
  const lowConfidence = predictions
    .filter((p) => p.confidence < 0.5)
    .map((p) => `${p.metricName} (confidence: ${(p.confidence * 100).toFixed(0)}%)`);
  const riskWarnings = predictions
    .filter((p) => p.predictedValue > p.upperBound || p.predictedValue < p.lowerBound)
    .map((p) => `${p.metricName} exceeds forecast bounds`);
  return {
    summary: `Generated ${predictions.length} predictions`,
    highConfidence,
    lowConfidence,
    riskWarnings,
  };
}
