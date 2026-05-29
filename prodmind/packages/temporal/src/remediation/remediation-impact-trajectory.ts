import type { MetricTrajectory,RemediationRecord } from '../types/index.ts';
import { calculateAcceleration, calculateSlope, calculateVolatility, determineTrend } from '../utils/index.ts';

export interface RemediationImpactTrajectory extends MetricTrajectory {
  metricName: 'remediation_impact';
}

export function analyzeRemediationImpactTrajectory(records: RemediationRecord[]): RemediationImpactTrajectory {
  const points = records.map((r) => ({ timestamp: r.timestamp, value: r.impactScore }));
  return {
    metricName: 'remediation_impact',
    points,
    slope: calculateSlope(points),
    acceleration: calculateAcceleration(points),
    volatility: calculateVolatility(points),
    trend: determineTrend(points),
  };
}
