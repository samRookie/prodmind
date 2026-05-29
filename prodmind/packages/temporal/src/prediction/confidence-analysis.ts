import type { BoundedPrediction } from '../types/index.ts';

export interface ConfidenceAnalysis {
  overallConfidence: number;
  reliability: 'high' | 'medium' | 'low' | 'unreliable';
  factors: Array<{ name: string; impact: number }>;
}

export function analyzeConfidence(predictions: BoundedPrediction[]): ConfidenceAnalysis {
  const avgConfidence = predictions.length > 0
    ? predictions.reduce((s, p) => s + p.confidence, 0) / predictions.length
    : 0;
  const reliability = avgConfidence >= 0.8 ? 'high'
    : avgConfidence >= 0.6 ? 'medium'
    : avgConfidence >= 0.4 ? 'low'
    : 'unreliable';
  return {
    overallConfidence: avgConfidence,
    reliability,
    factors: predictions.map((p) => ({
      name: p.metricName,
      impact: p.confidence / Math.max(0.01, avgConfidence),
    })),
  };
}
