import type { EvolutionPoint, TrajectoryResult } from '../types/index.ts';
import { generateId, now } from '../utils/index.ts';
import { analyzeArchitecturalTrajectory } from './architectural-trajectory.ts';
import { analyzeDegradationTrajectory } from './degradation-trajectory.ts';
import { analyzeHotspotTrajectory } from './hotspot-trajectory.ts';
import { analyzeRiskTrajectory } from './risk-trajectory.ts';

export class TrajectoryEngine {
  analyzeTrajectories(points: EvolutionPoint[], projectId: string): TrajectoryResult {
    const archTrajectory = analyzeArchitecturalTrajectory(points);
    const riskTrajectory = analyzeRiskTrajectory(points);
    const degTrajectory = analyzeDegradationTrajectory(points);
    const hotspotTrajectory = analyzeHotspotTrajectory(points);
    return {
      id: generateId(),
      projectId,
      createdAt: now(),
      metricTrajectories: [
        archTrajectory.nodeTrajectory,
        archTrajectory.edgeTrajectory,
        archTrajectory.complexityTrajectory,
        riskTrajectory.instabilityTrajectory,
        riskTrajectory.propagationTrajectory,
        riskTrajectory.couplingTrajectory,
      ],
      degradationVelocity: degTrajectory.velocity,
      instabilityAcceleration: riskTrajectory.riskAcceleration,
      hotspotGrowthRate: hotspotTrajectory.hotspotGrowthRate,
    };
  }
}
