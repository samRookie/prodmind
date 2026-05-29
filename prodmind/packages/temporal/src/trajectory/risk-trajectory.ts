import type { EvolutionPoint, MetricTrajectory } from '../types/index.ts';
import { calculateAcceleration, calculateSlope, determineTrend } from '../utils/index.ts';

export interface RiskTrajectoryResult {
  instabilityTrajectory: MetricTrajectory;
  propagationTrajectory: MetricTrajectory;
  couplingTrajectory: MetricTrajectory;
  riskVelocity: number;
  riskAcceleration: number;
}

export function analyzeRiskTrajectory(points: EvolutionPoint[]): RiskTrajectoryResult {
  const instabilityPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.instability }));
  const propagationPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.propagation }));
  const couplingPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.coupling }));
  return {
    instabilityTrajectory: {
      metricName: 'instability',
      points: instabilityPoints,
      slope: calculateSlope(instabilityPoints),
      acceleration: calculateAcceleration(instabilityPoints),
      volatility: 0,
      trend: determineTrend(instabilityPoints),
    },
    propagationTrajectory: {
      metricName: 'propagation',
      points: propagationPoints,
      slope: calculateSlope(propagationPoints),
      acceleration: calculateAcceleration(propagationPoints),
      volatility: 0,
      trend: determineTrend(propagationPoints),
    },
    couplingTrajectory: {
      metricName: 'coupling',
      points: couplingPoints,
      slope: calculateSlope(couplingPoints),
      acceleration: calculateAcceleration(couplingPoints),
      volatility: 0,
      trend: determineTrend(couplingPoints),
    },
    riskVelocity: calculateSlope(instabilityPoints),
    riskAcceleration: calculateAcceleration(instabilityPoints),
  };
}
