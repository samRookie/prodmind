import { TemporalError, TemporalErrorCode } from '../errors/index.ts';
import type { ForecastResult } from '../types/index.ts';

export function verifyForecastReplay(
  original: ForecastResult,
  replayed: ForecastResult,
): boolean {
  if (original.fingerprint !== replayed.fingerprint) {
    throw new TemporalError(
      'Forecast fingerprint mismatch during replay',
      TemporalErrorCode.REPLAY_MISMATCH,
      { original: original.fingerprint, replayed: replayed.fingerprint },
    );
  }
  if (original.predictions.length !== replayed.predictions.length) {
    return false;
  }
  return original.predictions.every((p, i) => {
    const r = replayed.predictions[i]!;
    return p.metricName === r.metricName
      && p.predictedValue === r.predictedValue
      && p.confidence === r.confidence;
  });
}
