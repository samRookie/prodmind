import type { HotspotEvolutionPoint } from '../types/index.ts';
import { linearProjection } from '../utils/index.ts';

export interface HotspotForecastResult {
  predictedHotspotCount: number;
  predictedIntensity: number;
  confidence: number;
  timeToCritical: number | null;
}

export function forecastHotspots(
  history: HotspotEvolutionPoint[],
  targetTimestamp: string,
): HotspotForecastResult {
  if (history.length < 2) {
    return { predictedHotspotCount: 0, predictedIntensity: 0, confidence: 0, timeToCritical: null };
  }
  const intensityPoints = history.map((h) => ({
    timestamp: h.timestamp,
    value: h.intensity,
  }));
  const projection = linearProjection(intensityPoints, targetTimestamp);
  const countPoints = history.map((h) => ({
    timestamp: h.timestamp,
    value: h.affectedModules,
  }));
  const countProjection = linearProjection(countPoints, targetTimestamp);
  return {
    predictedHotspotCount: Math.round(countProjection.value),
    predictedIntensity: projection.value,
    confidence: projection.confidence,
    timeToCritical: null,
  };
}
