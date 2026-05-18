import type { Database } from '@prodmind/db';
import { IncrementalRepository } from '@prodmind/db';
import { IncrementalEngine } from '@prodmind/parser';
import type { IncrementalInput, IncrementalOutput } from '@prodmind/parser';
import type { CompressionOutput } from '@prodmind/parser';
import { EventRepository } from '@prodmind/db';

export class IncrementalService {
  private readonly engine: IncrementalEngine;
  private readonly incrementalRepo: IncrementalRepository;
  private readonly events: EventRepository;

  public constructor(db: Database) {
    this.engine = new IncrementalEngine(db);
    this.incrementalRepo = new IncrementalRepository(db);
    this.events = new EventRepository(db);
  }

  public async analyze(
    projectId: string,
    currentSnapshotId: string,
    compressionOutput: CompressionOutput,
    fileHashes: Map<string, string>,
    dependencies: Array<{ sourceFile: string; targetFile: string }>,
  ): Promise<IncrementalOutput | null> {
    try {
      const input: IncrementalInput = {
        projectId,
        baseSnapshotId: null,
        currentSnapshotId,
        currentFileHashes: fileHashes,
        resolutionDependencies: dependencies,
        fileContexts: compressionOutput.fileContexts,
        moduleContexts: compressionOutput.moduleContexts,
        repositoryContext: compressionOutput.repositoryContext,
        metrics: compressionOutput.metrics,
      };

      const output = await this.engine.analyze(input);

      await this.persistResults(projectId, currentSnapshotId, output);

      await this.events.log('incremental_analysis_completed', {
        snapshotId: currentSnapshotId,
        baseSnapshotId: output.metrics.baseSnapshotId,
        reusedNodeCount: output.metrics.reusedNodeCount,
        recomputedNodeCount: output.metrics.recomputedNodeCount,
        incrementalSavingsRatio: output.metrics.incrementalSavingsRatio,
      });

      return output;
    } catch (err) {
      await this.events.log('incremental_analysis_warning', {
        snapshotId: currentSnapshotId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  private async persistResults(
    projectId: string,
    snapshotId: string,
    output: IncrementalOutput,
  ): Promise<void> {
    if (output.metrics.baseSnapshotId) {
      const lineageResult = await this.incrementalRepo.insertLineage({
        projectId,
        parentSnapshotId: output.metrics.baseSnapshotId,
        childSnapshotId: snapshotId,
        lineageType: 'DIRECT',
      });
      if (!lineageResult.success) {
        await this.events.log('incremental_persist_warning', {
          snapshotId,
          detail: 'Lineage insert failed',
          error: lineageResult.error,
        });
      }
    }

    const diffTypes = [
      { type: 'FILE', diff: output.snapshotDiff },
      { type: 'GRAPH', diff: output.graphDiff },
      { type: 'SEMANTIC', diff: output.semanticDiff },
      { type: 'COMPRESSION', diff: output.compressionDiff },
    ];

    for (const { type, diff } of diffTypes) {
      const detail = this.getDiffDetail(type, diff);
      const result = await this.incrementalRepo.insertDiff({
        snapshotId,
        baseSnapshotId: output.metrics.baseSnapshotId,
        diffType: type,
        addedCount: detail.addedCount,
        removedCount: detail.removedCount,
        modifiedCount: detail.modifiedCount,
        unchangedCount: detail.unchangedCount,
        detailsJson: detail.detailsJson,
      });
      if (!result.success) {
        await this.events.log('incremental_persist_warning', {
          snapshotId,
          detail: `Diff insert failed for ${type}`,
          error: result.error,
        });
      }
    }

    if (output.reusePlan.reuseNodes.length > 0 || output.reusePlan.reuseFileContexts.length > 0) {
      const reuseInputs: Array<{
        snapshotId: string;
        sourceSnapshotId: string;
        artifactType: string;
        artifactIdentifier: string;
      }> = [];

      for (const entry of output.reusePlan.reuseNodes) {
        reuseInputs.push({
          snapshotId,
          sourceSnapshotId: entry.sourceSnapshotId,
          artifactType: 'NODE',
          artifactIdentifier: entry.artifactId,
        });
      }
      for (const entry of output.reusePlan.reuseEdges) {
        reuseInputs.push({
          snapshotId,
          sourceSnapshotId: entry.sourceSnapshotId,
          artifactType: 'EDGE',
          artifactIdentifier: entry.artifactId,
        });
      }
      for (const entry of output.reusePlan.reuseFileContexts) {
        reuseInputs.push({
          snapshotId,
          sourceSnapshotId: entry.sourceSnapshotId,
          artifactType: 'FILE_CONTEXT',
          artifactIdentifier: entry.artifactId,
        });
      }
      for (const entry of output.reusePlan.reuseModuleContexts) {
        reuseInputs.push({
          snapshotId,
          sourceSnapshotId: entry.sourceSnapshotId,
          artifactType: 'MODULE_CONTEXT',
          artifactIdentifier: entry.artifactId,
        });
      }

      const reuseResult = await this.incrementalRepo.insertReuseArtifacts(reuseInputs);
      if (!reuseResult.success) {
        await this.events.log('incremental_persist_warning', {
          snapshotId,
          detail: 'Reuse artifacts insert failed',
          error: reuseResult.error,
        });
      }
    }

    if (output.invalidation.totalInvalidated > 0) {
      const invalidationInputs = output.invalidation.invalidations.map((inv) => ({
        snapshotId,
        regionType: inv.regionType,
        regionIdentifier: inv.regionIdentifier,
        invalidationReason: inv.invalidationReason,
      }));

      const invResult = await this.incrementalRepo.insertInvalidations(invalidationInputs);
      if (!invResult.success) {
        await this.events.log('incremental_persist_warning', {
          snapshotId,
          detail: 'Invalidation insert failed',
          error: invResult.error,
        });
      }
    }

    const metricsResult = await this.incrementalRepo.insertMetrics({
      snapshotId,
      baseSnapshotId: output.metrics.baseSnapshotId,
      reusedNodeCount: output.metrics.reusedNodeCount,
      recomputedNodeCount: output.metrics.recomputedNodeCount,
      reusedEdgeCount: output.metrics.reusedEdgeCount,
      recomputedEdgeCount: output.metrics.recomputedEdgeCount,
      reusedFileContextCount: output.metrics.reusedFileContextCount,
      recomputedFileContextCount: output.metrics.recomputedFileContextCount,
      reusedModuleContextCount: output.metrics.reusedModuleContextCount,
      recomputedModuleContextCount: output.metrics.recomputedModuleContextCount,
      incrementalSavingsRatio: output.metrics.incrementalSavingsRatio,
      recomputationReductionRatio: output.metrics.recomputationReductionRatio,
      traversalReductionRatio: output.metrics.traversalReductionRatio,
      totalPreviousNodes: output.metrics.totalPreviousNodes,
      totalPreviousEdges: output.metrics.totalPreviousEdges,
      totalCurrentNodes: output.metrics.totalCurrentNodes,
      totalCurrentEdges: output.metrics.totalCurrentEdges,
    });

    if (!metricsResult.success) {
      await this.events.log('incremental_persist_warning', {
        snapshotId,
        detail: 'Metrics insert failed',
        error: metricsResult.error,
      });
    }
  }

  private getDiffDetail(
    type: string,
    diff: { fileChanges?: { added: string[]; modified: string[]; removed: string[] }; hasChanges?: boolean; hasNodeChanges?: boolean; hasEdgeChanges?: boolean; hasDrift?: boolean; addedNodes?: unknown[]; modifiedNodes?: unknown[]; removedNodes?: unknown[]; addedEdges?: unknown[]; removedEdges?: unknown[] },
  ): { addedCount: number; removedCount: number; modifiedCount: number; unchangedCount: number; detailsJson: string | null } {
    let addedCount = 0;
    let removedCount = 0;
    let modifiedCount = 0;
    const unchangedCount = 0;
    let detail: Record<string, unknown> = {};

    if (type === 'FILE' && diff.fileChanges) {
      addedCount = diff.fileChanges.added.length;
      removedCount = diff.fileChanges.removed.length;
      modifiedCount = diff.fileChanges.modified.length;
      detail = { added: diff.fileChanges.added, removed: diff.fileChanges.removed, modified: diff.fileChanges.modified };
    } else if (type === 'GRAPH') {
      addedCount = (diff.addedNodes ?? []).length;
      removedCount = (diff.removedNodes ?? []).length;
      modifiedCount = (diff.modifiedNodes ?? []).length;
      detail = {
        addedNodes: (diff.addedNodes ?? []).map((n: unknown) => (n as { filePath: string }).filePath),
        removedNodes: (diff.removedNodes ?? []).map((n: unknown) => (n as { filePath: string }).filePath),
        addedEdges: (diff.addedEdges ?? []).length,
        removedEdges: (diff.removedEdges ?? []).length,
      };
    } else if (type === 'SEMANTIC') {
      modifiedCount = (diff as unknown as { changedModulePaths: string[] }).changedModulePaths?.length ?? 0;
      detail = { changedModules: (diff as unknown as { changedModulePaths: string[] }).changedModulePaths ?? [] };
    } else if (type === 'COMPRESSION') {
      addedCount = (diff as unknown as { invalidFileContextPaths: string[] }).invalidFileContextPaths?.length ?? 0;
      detail = {
        reusableFiles: (diff as unknown as { reusableFileContextPaths: string[] }).reusableFileContextPaths?.length ?? 0,
        reusableModules: (diff as unknown as { reusableModuleContextPaths: string[] }).reusableModuleContextPaths?.length ?? 0,
      };
    }

    return {
      addedCount,
      removedCount,
      modifiedCount,
      unchangedCount,
      detailsJson: JSON.stringify(detail),
    };
  }
}
