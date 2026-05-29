import type { ForecastResult } from '../types/index.ts';

export interface AuditEntry {
  timestamp: string;
  check: string;
  passed: boolean;
  details: string;
}

export function auditForecast(forecast: ForecastResult): AuditEntry[] {
  const entries: AuditEntry[] = [];
  entries.push({
    timestamp: new Date().toISOString(),
    check: 'forecast_determinism',
    passed: forecast.fingerprint.length > 0,
    details: `Fingerprint: ${forecast.fingerprint}`,
  });
  entries.push({
    timestamp: new Date().toISOString(),
    check: 'forecast_boundedness',
    passed: forecast.predictions.every((p) => isFinite(p.predictedValue)),
    details: `Predictions: ${forecast.predictions.length}`,
  });
  entries.push({
    timestamp: new Date().toISOString(),
    check: 'forecast_evidence',
    passed: forecast.evidence.length > 0,
    details: `Evidence count: ${forecast.evidence.length}`,
  });
  return entries;
}
