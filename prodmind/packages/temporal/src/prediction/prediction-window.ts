import { TemporalError, TemporalErrorCode } from '../errors/index.ts';
import type { ForecastWindow } from '../types/index.ts';

export function createPredictionWindow(
  startTimestamp: string,
  endTimestamp: string,
  minProjections: number,
  maxConfidenceThreshold: number,
): ForecastWindow {
  const start = new Date(startTimestamp).getTime();
  const end = new Date(endTimestamp).getTime();
  if (end <= start) {
    throw new TemporalError(
      'Prediction window end must be after start',
      TemporalErrorCode.INVALID_FORECAST_WINDOW,
      { startTimestamp, endTimestamp },
    );
  }
  return {
    startTimestamp,
    endTimestamp,
    projectionCount: Math.max(1, minProjections),
    confidenceThreshold: Math.max(0, Math.min(1, maxConfidenceThreshold)),
    bounds: { lower: 0, upper: Infinity },
  };
}

export function computePredictionHorizon(window: ForecastWindow): number {
  return new Date(window.endTimestamp).getTime() - new Date(window.startTimestamp).getTime();
}
