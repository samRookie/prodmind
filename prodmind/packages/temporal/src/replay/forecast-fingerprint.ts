import type { ForecastResult } from '../types/index.ts';

export function computeForecastFingerprint(forecast: ForecastResult): string {
  const predictionPart = forecast.predictions
    .map((p) => `${p.metricName}:${p.predictedValue}:${p.confidence}`)
    .join('|');
  const evidencePart = forecast.evidence
    .map((e) => `${e.type}:${e.confidence}`)
    .join('|');
  const raw = `${forecast.projectId}|${forecast.forecastWindow.startTimestamp}|${forecast.forecastWindow.endTimestamp}|${predictionPart}|${evidencePart}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(16)}`;
}

export function verifyFingerprint(forecast: ForecastResult): boolean {
  return forecast.fingerprint === computeForecastFingerprint(forecast);
}
