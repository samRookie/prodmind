import type { IncrementalAnalysisMetrics, IncrementalSnapshotDiffResult, IncrementalGraphDiffResult, ReusePlan, InvalidationResult } from './diff-types.ts';

export class DiffMetricsCalculator {
  public calculate(
    snapshotDiff: IncrementalSnapshotDiffResult,
    graphDiff: IncrementalGraphDiffResult,
    reusePlan: ReusePlan,
    invalidation: InvalidationResult,
  ): IncrementalAnalysisMetrics {
    const reusedNodeCount = reusePlan.reuseNodes.length;
    const recomputedNodeCount = graphDiff.totalCurrentNodes - reusePlan.reuseNodes.length;

    const reusedEdgeCount = reusePlan.reuseEdges.length;
    const recomputedEdgeCount = graphDiff.totalCurrentEdges - reusePlan.reuseEdges.length;

    const reusedFileContextCount = reusePlan.reuseFileContexts.length;
    const recomputedFileContextCount = snapshotDiff.totalCurrentFiles - reusePlan.reuseFileContexts.length;

    const reusedModuleContextCount = reusePlan.reuseModuleContexts.length;
    const totalCurrentModules = graphDiff.totalCurrentNodes; // approximation
    const recomputedModuleContextCount = totalCurrentModules - reusePlan.reuseModuleContexts.length;

    const incrementalSavingsRatio = graphDiff.totalPreviousNodes > 0
      ? reusedNodeCount / graphDiff.totalPreviousNodes
      : 0;

    const recomputationReductionRatio = graphDiff.totalPreviousNodes > 0
      ? (graphDiff.totalPreviousNodes - recomputedNodeCount) / graphDiff.totalPreviousNodes
      : 0;

    const traversalReductionRatio = graphDiff.totalPreviousNodes > 0
      ? invalidation.preservedNodeCount / graphDiff.totalPreviousNodes
      : 0;

    return {
      baseSnapshotId: snapshotDiff.baseSnapshotId,
      reusedNodeCount,
      recomputedNodeCount: Math.max(0, recomputedNodeCount),
      reusedEdgeCount,
      recomputedEdgeCount: Math.max(0, recomputedEdgeCount),
      reusedFileContextCount,
      recomputedFileContextCount: Math.max(0, recomputedFileContextCount),
      reusedModuleContextCount,
      recomputedModuleContextCount: Math.max(0, recomputedModuleContextCount),
      incrementalSavingsRatio: Math.round(incrementalSavingsRatio * 10000) / 10000,
      recomputationReductionRatio: Math.round(recomputationReductionRatio * 10000) / 10000,
      traversalReductionRatio: Math.round(traversalReductionRatio * 10000) / 10000,
      totalPreviousNodes: graphDiff.totalPreviousNodes,
      totalPreviousEdges: graphDiff.totalPreviousEdges,
      totalCurrentNodes: graphDiff.totalCurrentNodes,
      totalCurrentEdges: graphDiff.totalCurrentEdges,
    };
  }
}
