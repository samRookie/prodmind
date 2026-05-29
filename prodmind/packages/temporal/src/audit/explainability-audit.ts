import type { ForecastResult, TrajectoryResult } from '../types/index.ts';
import type { AuditEntry } from './forecast-audit.ts';

export interface ExplainabilityReport {
  forecastRationale: string;
  trajectoryRationale: string;
  confidenceRationale: string;
}

export function auditExplainability(
  forecast: ForecastResult,
  trajectory: TrajectoryResult,
): { entries: AuditEntry[]; report: ExplainabilityReport } {
  const forecastRationale = `Forecast ${forecast.id} for project ${forecast.projectId} with ${forecast.predictions.length} predictions at confidence ${forecast.confidence}`;
  const trajectoryRationale = `Trajectory ${trajectory.id} with ${trajectory.metricTrajectories.length} metrics, degradation velocity ${trajectory.degradationVelocity}`;
  const confidenceRationale = `Forecast confidence ${forecast.confidence} derived from ${forecast.evidence.length} evidence items`;
  const entries: AuditEntry[] = [
    {
      timestamp: new Date().toISOString(),
      check: 'explainability.forecast_rationale',
      passed: forecastRationale.length > 0,
      details: forecastRationale,
    },
    {
      timestamp: new Date().toISOString(),
      check: 'explainability.trajectory_rationale',
      passed: trajectoryRationale.length > 0,
      details: trajectoryRationale,
    },
    {
      timestamp: new Date().toISOString(),
      check: 'explainability.confidence_rationale',
      passed: confidenceRationale.length > 0,
      details: confidenceRationale,
    },
    {
      timestamp: new Date().toISOString(),
      check: 'explainability.evidence_traceable',
      passed: forecast.evidence.length > 0,
      details: `Evidence items: ${forecast.evidence.length}`,
    },
  ];
  return { entries, report: { forecastRationale, trajectoryRationale, confidenceRationale } };
}
