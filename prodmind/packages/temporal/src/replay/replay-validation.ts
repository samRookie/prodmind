import type { ForecastResult, SimulationResult,TrajectoryResult } from '../types/index.ts';

export interface ReplayValidationResult {
  valid: boolean;
  checks: ReplayValidationCheck[];
}

export interface ReplayValidationCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export function validateReplayInput(
  forecast: ForecastResult,
  trajectory: TrajectoryResult,
  simulation: SimulationResult,
): ReplayValidationResult {
  const checks: ReplayValidationCheck[] = [];
  checks.push({
    name: 'forecast_fingerprint',
    passed: forecast.fingerprint.length > 0,
    detail: `Forecast fingerprint: ${forecast.fingerprint}`,
  });
  checks.push({
    name: 'trajectory_metrics',
    passed: trajectory.metricTrajectories.length > 0,
    detail: `Trajectory metrics: ${trajectory.metricTrajectories.length}`,
  });
  checks.push({
    name: 'simulation_fingerprint',
    passed: simulation.fingerprint.length > 0,
    detail: `Simulation fingerprint: ${simulation.fingerprint}`,
  });
  checks.push({
    name: 'simulation_steps',
    passed: simulation.steps.length > 0,
    detail: `Simulation steps: ${simulation.steps.length}`,
  });
  return {
    valid: checks.every((c) => c.passed),
    checks,
  };
}
