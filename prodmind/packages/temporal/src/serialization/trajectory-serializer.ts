import type { MetricTrajectory,TrajectoryResult } from '../types/index.ts';

export interface TrajectorySchema {
  version: 1;
  id: string;
  projectId: string;
  createdAt: string;
  metricTrajectories: Array<{
    metricName: string;
    points: Array<{ timestamp: string; value: number }>;
    slope: number;
    acceleration: number;
    volatility: number;
    trend: string;
  }>;
  degradationVelocity: number;
  instabilityAcceleration: number;
  hotspotGrowthRate: number;
}

export function serializeTrajectoryV1(trajectory: TrajectoryResult): string {
  const schema: TrajectorySchema = {
    version: 1,
    id: trajectory.id,
    projectId: trajectory.projectId,
    createdAt: trajectory.createdAt,
    metricTrajectories: trajectory.metricTrajectories.map((t) => ({
      metricName: t.metricName,
      points: t.points.map((p) => ({ timestamp: p.timestamp, value: p.value })),
      slope: t.slope,
      acceleration: t.acceleration,
      volatility: t.volatility,
      trend: t.trend,
    })),
    degradationVelocity: trajectory.degradationVelocity,
    instabilityAcceleration: trajectory.instabilityAcceleration,
    hotspotGrowthRate: trajectory.hotspotGrowthRate,
  };
  return JSON.stringify(schema);
}

export function deserializeTrajectoryV1(json: string): TrajectoryResult {
  const schema = JSON.parse(json) as TrajectorySchema;
  return {
    id: schema.id,
    projectId: schema.projectId,
    createdAt: schema.createdAt,
    metricTrajectories: schema.metricTrajectories.map((t) => ({
      metricName: t.metricName,
      points: t.points.map((p) => ({ timestamp: p.timestamp, value: p.value })),
      slope: t.slope,
      acceleration: t.acceleration,
      volatility: t.volatility,
      trend: t.trend as MetricTrajectory['trend'],
    })),
    degradationVelocity: schema.degradationVelocity,
    instabilityAcceleration: schema.instabilityAcceleration,
    hotspotGrowthRate: schema.hotspotGrowthRate,
  };
}
