import type { EvolutionPoint } from '../types/index.ts';
import { calculateAcceleration, calculateSlope, determineTrend } from '../utils/index.ts';
import type { TrendSignal } from './trend-detection.ts';

export function analyzeDependencyTrends(points: EvolutionPoint[]): TrendSignal[] {
  const couplingPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.coupling }));
  const propagationPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.propagation }));
  const couplingValues = couplingPoints.map((p) => p.value);
  const propagationValues = propagationPoints.map((p) => p.value);
  const couplingSlope = calculateSlope(couplingPoints);
  const propagationSlope = calculateSlope(propagationPoints);
  return [
    {
      metricName: 'coupling',
      trend: determineTrend(couplingPoints),
      slope: couplingSlope,
      acceleration: calculateAcceleration(couplingPoints),
      strength: Math.abs(couplingSlope) / (Math.max(...couplingValues, 1)),
      sustained: false,
    },
    {
      metricName: 'propagation',
      trend: determineTrend(propagationPoints),
      slope: propagationSlope,
      acceleration: calculateAcceleration(propagationPoints),
      strength: Math.abs(propagationSlope) / (Math.max(...propagationValues, 1)),
      sustained: false,
    },
  ];
}
