import type { ReusePlan, ReusePlanEntry, IncrementalCompressionDiffResult, IncrementalGraphDiffResult } from './diff-types.ts';
import { IncrementalReuseError } from './diff-errors.ts';

export class ReuseEngine {
  public plan(
    graphDiff: IncrementalGraphDiffResult,
    compressionDiff: IncrementalCompressionDiffResult,
    baseSnapshotId: string | null,
  ): ReusePlan {
    try {
      if (!baseSnapshotId) {
        return {
          reuseNodes: [],
          reuseEdges: [],
          reuseFileContexts: [],
          reuseModuleContexts: [],
          recomputeAll: true,
        };
      }

      const reuseNodes: ReusePlanEntry[] = [];
      const reuseEdges: ReusePlanEntry[] = [];
      const reuseFileContexts: ReusePlanEntry[] = [];
      const reuseModuleContexts: ReusePlanEntry[] = [];

      for (const nodeId of graphDiff.unchangedNodeIds) {
        reuseNodes.push({
          artifactType: 'NODE',
          artifactId: nodeId,
          sourceSnapshotId: baseSnapshotId,
        });
      }

      for (const fp of compressionDiff.reusableFileContextPaths) {
        reuseFileContexts.push({
          artifactType: 'FILE_CONTEXT',
          artifactId: fp,
          sourceSnapshotId: baseSnapshotId,
        });
      }

      for (const mp of compressionDiff.reusableModuleContextPaths) {
        reuseModuleContexts.push({
          artifactType: 'MODULE_CONTEXT',
          artifactId: mp,
          sourceSnapshotId: baseSnapshotId,
        });
      }

      const hasGraphChanges = graphDiff.hasNodeChanges || graphDiff.hasEdgeChanges;
      const hasCompressionChanges = compressionDiff.hasChanges;
      const recomputeAll = !baseSnapshotId || (hasGraphChanges && hasCompressionChanges && graphDiff.totalPreviousNodes === 0);

      return {
        reuseNodes,
        reuseEdges,
        reuseFileContexts,
        reuseModuleContexts,
        recomputeAll,
      };
    } catch (err) {
      throw new IncrementalReuseError(
        `Reuse planning failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
