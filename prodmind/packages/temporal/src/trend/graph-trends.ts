import type { EvolutionPoint } from '../types/index.ts';
import { calculateAcceleration, calculateSlope, determineTrend } from '../utils/index.ts';
import type { TrendSignal } from './trend-detection.ts';

export function analyzeGraphTrends(points: EvolutionPoint[]): TrendSignal[] {
  const nodePoints = points.map((p) => ({ timestamp: p.timestamp, value: p.nodeCount }));
  const edgePoints = points.map((p) => ({ timestamp: p.timestamp, value: p.edgeCount }));
  const nodeValues = nodePoints.map((p) => p.value);
  const edgeValues = edgePoints.map((p) => p.value);
  const nodeSlope = calculateSlope(nodePoints);
  const edgeSlope = calculateSlope(edgePoints);
  return [
    {
      metricName: 'nodes',
      trend: determineTrend(nodePoints),
      slope: nodeSlope,
      acceleration: calculateAcceleration(nodePoints),
      strength: Math.abs(nodeSlope) / (Math.max(...nodeValues, 1)),
      sustained: false,
    },
    {
      metricName: 'edges',
      trend: determineTrend(edgePoints),
      slope: edgeSlope,
      acceleration: calculateAcceleration(edgePoints),
      strength: Math.abs(edgeSlope) / (Math.max(...edgeValues, 1)),
      sustained: false,
    },
  ];
}
