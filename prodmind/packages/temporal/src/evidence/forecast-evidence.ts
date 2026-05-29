import type { ForecastResult,TemporalEvidence } from '../types/index.ts';
import { createTemporalEvidence } from './temporal-evidence.ts';

export function buildForecastEvidence(
  forecast: ForecastResult,
  confidence: number,
): TemporalEvidence {
  const metrics: Record<string, number> = {};
  for (const p of forecast.predictions) {
    metrics[p.metricName] = p.predictedValue;
  }
  return createTemporalEvidence(
    'forecast',
    `Forecast with ${forecast.predictions.length} predictions across ${forecast.evidence.length} evidence sources`,
    forecast.evidence.flatMap((e) => e.snapshotIds),
    metrics,
    forecast.predictions.reduce((s, p) => s + (p.predictedValue - p.currentValue), 0) / forecast.predictions.length,
    confidence,
  );
}
