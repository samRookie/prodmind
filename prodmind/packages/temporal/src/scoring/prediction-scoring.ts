import type { BoundedPrediction } from '../types/index.ts';

export interface PredictionScore {
  metricName: string;
  reliability: number;
  confidence: number;
  spread: number;
}

export function scorePrediction(prediction: BoundedPrediction): PredictionScore {
  const spread = Math.abs(prediction.upperBound - prediction.lowerBound) / Math.max(1, Math.abs(prediction.predictedValue));
  const spreadScore = Math.max(0, 1 - spread);
  const reliability = prediction.confidence * 0.6 + spreadScore * 0.4;
  return {
    metricName: prediction.metricName,
    reliability,
    confidence: prediction.confidence,
    spread,
  };
}

export function scorePredictions(predictions: BoundedPrediction[]): PredictionScore[] {
  return predictions.map(scorePrediction);
}
