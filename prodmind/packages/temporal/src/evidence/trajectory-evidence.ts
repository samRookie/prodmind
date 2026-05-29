import type { MetricTrajectory,TemporalEvidence } from '../types/index.ts';
import { createTemporalEvidence } from './temporal-evidence.ts';

export function buildTrajectoryEvidence(
  trajectory: MetricTrajectory,
  confidence: number,
): TemporalEvidence {
  const snapshotIds = trajectory.points.map((p) => p.timestamp);
  return createTemporalEvidence(
    'trajectory',
    `${trajectory.metricName} trajectory: ${trajectory.trend} (slope: ${trajectory.slope.toFixed(4)})`,
    snapshotIds,
    { [trajectory.metricName]: trajectory.points[trajectory.points.length - 1]?.value ?? 0 },
    trajectory.slope,
    confidence,
  );
}
