import type { BoundedPrediction, ForecastWindow,MetricTrajectory } from '../types/index.ts';
import { computeBounds,linearProjection } from '../utils/index.ts';

export function forecastRisk(
  trajectory: MetricTrajectory,
  window: ForecastWindow,
): BoundedPrediction {
  const targetTime = window.endTimestamp;
  const horizonMs = new Date(targetTime).getTime() - new Date(window.startTimestamp).getTime();
  const projection = linearProjection(trajectory.points, targetTime);
  const bounds = computeBounds(projection.value, projection.confidence, horizonMs, horizonMs);
  const currentValue = trajectory.points.length > 0
    ? trajectory.points[trajectory.points.length - 1]!.value
    : 0;
  return {
    metricName: trajectory.metricName,
    currentValue,
    predictedValue: projection.value,
    lowerBound: bounds.lower,
    upperBound: bounds.upper,
    confidence: projection.confidence,
    horizonMs,
  };
}
