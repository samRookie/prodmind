import { TemporalError, TemporalErrorCode } from '../errors/index.ts';
import type { ForecastWindow } from '../types/index.ts';

export function createForecastWindow(
  startTimestamp: string,
  endTimestamp: string,
  projectionCount: number,
  confidenceThreshold: number,
): ForecastWindow {
  const start = new Date(startTimestamp).getTime();
  const end = new Date(endTimestamp).getTime();
  if (end <= start) {
    throw new TemporalError(
      'Forecast window end must be after start',
      TemporalErrorCode.INVALID_FORECAST_WINDOW,
      { startTimestamp, endTimestamp },
    );
  }
  return {
    startTimestamp,
    endTimestamp,
    projectionCount: Math.max(1, projectionCount),
    confidenceThreshold: Math.max(0, Math.min(1, confidenceThreshold)),
    bounds: { lower: 0, upper: Infinity },
  };
}

export function computeForecastHorizon(window: ForecastWindow): number {
  return new Date(window.endTimestamp).getTime() - new Date(window.startTimestamp).getTime();
}
