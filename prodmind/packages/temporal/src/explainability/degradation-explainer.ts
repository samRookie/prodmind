import type { MetricTrajectory } from '../types/index.ts';

export interface DegradationExplanation {
  summary: string;
  factors: Array<{ name: string; contribution: string; severity: 'low' | 'medium' | 'high' }>;
  accelerationWarning: string;
}

export function explainDegradation(trajectories: MetricTrajectory[]): DegradationExplanation {
  const factors = trajectories.map((t) => ({
    name: t.metricName,
    contribution: `slope=${t.slope.toFixed(4)}, acceleration=${t.acceleration.toFixed(4)}`,
    severity: (t.acceleration > 0.01 ? 'high' : t.acceleration > 0.001 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
  }));
  const maxAccel = Math.max(...trajectories.map((t) => t.acceleration));
  const warning = maxAccel > 0.01
    ? `Critical: degradation accelerating at ${maxAccel.toFixed(4)}`
    : `Degradation within normal bounds (max acceleration: ${maxAccel.toFixed(4)})`;
  return {
    summary: `Analyzed ${trajectories.length} degradation trajectories`,
    factors,
    accelerationWarning: warning,
  };
}
