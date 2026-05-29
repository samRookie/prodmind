import type { BoundedPrediction } from '../types/index.ts';

export interface PredictionRisk {
  metricName: string;
  riskLevel: 'critical' | 'high' | 'moderate' | 'low';
  riskScore: number;
  confidenceAdjusted: number;
}

export function assessPredictionRisk(prediction: BoundedPrediction): PredictionRisk {
  const spread = prediction.upperBound - prediction.lowerBound;
  const baseRisk = spread / Math.max(1, Math.abs(prediction.predictedValue));
  const confidencePenalty = 1 - prediction.confidence;
  const riskScore = Math.min(1, baseRisk * (1 + confidencePenalty));
  const riskLevel = riskScore >= 0.8 ? 'critical'
    : riskScore >= 0.6 ? 'high'
    : riskScore >= 0.3 ? 'moderate'
    : 'low';
  return {
    metricName: prediction.metricName,
    riskLevel,
    riskScore,
    confidenceAdjusted: prediction.confidence * (1 - riskScore),
  };
}
