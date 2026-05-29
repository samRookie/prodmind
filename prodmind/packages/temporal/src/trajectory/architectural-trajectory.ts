import type { EvolutionPoint, MetricTrajectory } from '../types/index.ts';
import { calculateAcceleration, calculateSlope, determineTrend } from '../utils/index.ts';

export interface ArchitecturalTrajectoryResult {
  direction: 'growing' | 'shrinking' | 'stable' | 'oscillating';
  growthVelocity: number;
  growthAcceleration: number;
  nodeTrajectory: MetricTrajectory;
  edgeTrajectory: MetricTrajectory;
  complexityTrajectory: MetricTrajectory;
}

export function analyzeArchitecturalTrajectory(points: EvolutionPoint[]): ArchitecturalTrajectoryResult {
  const nodePoints = points.map((p) => ({ timestamp: p.timestamp, value: p.nodeCount }));
  const edgePoints = points.map((p) => ({ timestamp: p.timestamp, value: p.edgeCount }));
  const complexityPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.complexity }));
  const nodeSlope = calculateSlope(nodePoints);
  const direction = nodeSlope > 0.1 ? 'growing' : nodeSlope < -0.1 ? 'shrinking' : 'stable';
  return {
    direction,
    growthVelocity: nodeSlope,
    growthAcceleration: calculateAcceleration(nodePoints),
    nodeTrajectory: {
      metricName: 'nodes',
      points: nodePoints,
      slope: nodeSlope,
      acceleration: calculateAcceleration(nodePoints),
      volatility: 0,
      trend: determineTrend(nodePoints),
    },
    edgeTrajectory: {
      metricName: 'edges',
      points: edgePoints,
      slope: calculateSlope(edgePoints),
      acceleration: calculateAcceleration(edgePoints),
      volatility: 0,
      trend: determineTrend(edgePoints),
    },
    complexityTrajectory: {
      metricName: 'complexity',
      points: complexityPoints,
      slope: calculateSlope(complexityPoints),
      acceleration: calculateAcceleration(complexityPoints),
      volatility: 0,
      trend: determineTrend(complexityPoints),
    },
  };
}
