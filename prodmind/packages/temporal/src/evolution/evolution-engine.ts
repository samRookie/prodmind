import { TemporalError, TemporalErrorCode } from '../errors/index.ts';
import { sequenceSnapshots } from '../timeline/snapshot-sequencing.ts';
import type { EvolutionPoint, GraphDelta, MetricTrajectory,TemporalSnapshot } from '../types/index.ts';
import { analyzeComplexityEvolution } from './complexity-evolution.ts';
import { analyzeCouplingEvolution } from './coupling-evolution.ts';
import type { DependencyEvolutionResult } from './dependency-evolution.ts';
import { analyzeDependencyEvolution } from './dependency-evolution.ts';
import { computeAggregateDeltas, computeTotalEvolution } from './evolution-diff.ts';
import { buildEvolutionPoints } from './graph-evolution.ts';
import { computeGraphGrowthRate } from './graph-evolution.ts';
import { analyzeInstabilityEvolution } from './instability-evolution.ts';
import { analyzePropagationEvolution } from './propagation-evolution.ts';
import { analyzeDriftEvolution,analyzeSemanticEvolution } from './semantic-evolution.ts';

export interface EvolutionResult {
  evolutionPoints: EvolutionPoint[];
  graphGrowthRate: number;
  aggregateDeltas: GraphDelta[];
  totalEvolution: GraphDelta;
  complexityTrajectory: MetricTrajectory;
  instabilityTrajectory: MetricTrajectory;
  couplingTrajectory: MetricTrajectory;
  propagationTrajectory: MetricTrajectory;
  semanticTrajectory: MetricTrajectory;
  driftTrajectory: MetricTrajectory;
  dependencyEvolution: DependencyEvolutionResult;
  snapshotCount: number;
  startTimestamp: string;
  endTimestamp: string;
}

export class EvolutionEngine {
  analyze(snapshots: TemporalSnapshot[]): EvolutionResult {
    if (snapshots.length < 2) {
      throw new TemporalError(
        'At least 2 snapshots required for evolution analysis',
        TemporalErrorCode.INSUFFICIENT_SNAPSHOTS,
      );
    }
    const sorted = sequenceSnapshots(snapshots);
    const evolutionPoints = buildEvolutionPoints(sorted);
    const graphGrowthRate = computeGraphGrowthRate(evolutionPoints);
    const aggregateDeltas = computeAggregateDeltas(sorted);
    const totalEvolution = computeTotalEvolution(aggregateDeltas);

    return {
      evolutionPoints,
      graphGrowthRate,
      aggregateDeltas,
      totalEvolution,
      complexityTrajectory: analyzeComplexityEvolution(evolutionPoints),
      instabilityTrajectory: analyzeInstabilityEvolution(evolutionPoints),
      couplingTrajectory: analyzeCouplingEvolution(evolutionPoints),
      propagationTrajectory: analyzePropagationEvolution(evolutionPoints),
      semanticTrajectory: analyzeSemanticEvolution(evolutionPoints),
      driftTrajectory: analyzeDriftEvolution(evolutionPoints),
      dependencyEvolution: analyzeDependencyEvolution(evolutionPoints),
      snapshotCount: sorted.length,
      startTimestamp: sorted[0]!.timestamp,
      endTimestamp: sorted[sorted.length - 1]!.timestamp,
    };
  }
}
