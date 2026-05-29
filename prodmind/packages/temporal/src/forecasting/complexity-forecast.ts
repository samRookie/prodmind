import type { BoundedPrediction, ForecastWindow,MetricTrajectory } from '../types/index.ts';
import { forecastRisk } from './risk-forecast.ts';

export function forecastComplexity(
  trajectory: MetricTrajectory,
  window: ForecastWindow,
): BoundedPrediction {
  return forecastRisk(trajectory, window);
}
