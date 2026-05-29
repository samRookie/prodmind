import type { BoundedPrediction, ForecastWindow } from '../types/index.ts';
import { computeBounds,linearProjection } from '../utils/index.ts';

export function deterministicPredict(
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

export function verifyDeterminism(
  a: BoundedPrediction,
  b: BoundedPrediction,
): boolean {
  return a.metricName === b.metricName
    && a.predictedValue === b.predictedValue
    && a.confidence === b.confidence
    && a.lowerBound === b.lowerBound
    && a.upperBound === b.upperBound;
}
