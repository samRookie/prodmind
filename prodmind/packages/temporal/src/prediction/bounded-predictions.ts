import type { BoundedPrediction, ForecastWindow } from '../types/index.ts';
import { computeBounds,linearProjection } from '../utils/index.ts';

export function generateBoundedPrediction(
  metricName: string,
  historicalValues: Array<{ timestamp: string; value: number }>,
  window: ForecastWindow,
): BoundedPrediction {
  const horizonMs = new Date(window.endTimestamp).getTime() - new Date(window.startTimestamp).getTime();
  const projection = linearProjection(historicalValues, window.endTimestamp);
  const bounds = computeBounds(projection.value, projection.confidence, horizonMs, horizonMs);
  const currentValue = historicalValues.length > 0
    ? historicalValues[historicalValues.length - 1]!.value
    : 0;
  return {
    metricName,
    currentValue,
    predictedValue: projection.value,
    lowerBound: bounds.lower,
    upperBound: bounds.upper,
    confidence: projection.confidence,
    horizonMs,
  };
}

export function isWithinBounds(prediction: BoundedPrediction): boolean {
  return prediction.predictedValue >= prediction.lowerBound
    && prediction.predictedValue <= prediction.upperBound;
}
