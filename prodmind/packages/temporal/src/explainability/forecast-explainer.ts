import type { ForecastResult } from '../types/index.ts';

export interface ForecastExplanation {
  summary: string;
  predictions: Array<{
    metric: string;
    trend: string;
    confidenceLabel: string;
    evidenceCount: number;
  }>;
  confidenceBreakdown: string;
}

export function explainForecast(forecast: ForecastResult): ForecastExplanation {
  return {
    summary: `Forecast covers ${forecast.predictions.length} metrics with ${(forecast.confidence * 100).toFixed(0)}% overall confidence`,
    predictions: forecast.predictions.map((p) => ({
      metric: p.metricName,
      trend: p.predictedValue > p.currentValue ? 'increasing' : 'decreasing',
      confidenceLabel: p.confidence >= 0.8 ? 'high' : p.confidence >= 0.6 ? 'medium' : 'low',
      evidenceCount: forecast.evidence.length,
    })),
    confidenceBreakdown: `Average prediction confidence: ${(forecast.confidence * 100).toFixed(0)}%`,
  };
}
