import type { InvalidationResult, InvalidationEntry, IncrementalGraphDiffResult, IncrementalSemanticDiffResult, IncrementalDependencyImpactResult } from './diff-types.ts';
import { IncrementalInvalidationError } from './diff-errors.ts';

export class InvalidationEngine {
  public compute(
    graphDiff: IncrementalGraphDiffResult,
    semanticDiff: IncrementalSemanticDiffResult,
    dependencyImpact: IncrementalDependencyImpactResult,
  ): InvalidationResult {
    try {
      const invalidations: InvalidationEntry[] = [];
      const preservedNodeSet = new Set<string>();

      for (const n of graphDiff.removedNodes) {
        invalidations.push({
          regionType: 'NODE',
          regionIdentifier: n.id,
          invalidationReason: 'FILE_MODIFIED',
        });
      }

      for (const n of graphDiff.modifiedNodes) {
        invalidations.push({
          regionType: 'NODE',
          regionIdentifier: n.id,
          invalidationReason: 'FILE_MODIFIED',
        });
      }

      for (const n of graphDiff.addedNodes) {
        invalidations.push({
          regionType: 'NODE',
          regionIdentifier: n.id,
          invalidationReason: 'FILE_MODIFIED',
        });
      }

      for (const nodeId of graphDiff.unchangedNodeIds) {
        preservedNodeSet.add(nodeId);
      }

      for (const nodeId of dependencyImpact.impactedNodeIds) {
        if (!preservedNodeSet.has(nodeId)) {
          invalidations.push({
            regionType: 'NODE',
            regionIdentifier: nodeId,
            invalidationReason: 'TRANSITIVE_DEPENDENCY',
          });
        }
      }

      for (const modulePath of semanticDiff.changedModulePaths) {
        invalidations.push({
          regionType: 'MODULE',
          regionIdentifier: modulePath,
          invalidationReason: 'SEMANTIC_DRIFT',
        });
      }

      for (const drift of semanticDiff.classificationDrift) {
        invalidations.push({
          regionType: 'SEMANTIC',
          regionIdentifier: `${drift.filePath}:${drift.from}->${drift.to}`,
          invalidationReason: 'CLASSIFICATION_DRIFT',
        });
      }

      for (const modulePath of dependencyImpact.impactedModulePaths) {
        const alreadySeen = invalidations.some(
          (i) => i.regionType === 'MODULE' && i.regionIdentifier === modulePath,
        );
        if (!alreadySeen) {
          invalidations.push({
            regionType: 'MODULE',
            regionIdentifier: modulePath,
            invalidationReason: 'TRANSITIVE_DEPENDENCY',
          });
        }
      }

      const uniqueInvalidations = this.deduplicate(invalidations);

      const preservedNodeCount = graphDiff.unchangedNodeIds.length;
      const preservedEdgeCount = graphDiff.totalPreviousEdges - graphDiff.removedEdges.length;

      return {
        invalidations: uniqueInvalidations,
        totalInvalidated: uniqueInvalidations.length,
        preservedNodeCount,
        preservedEdgeCount,
      };
    } catch (err) {
      throw new IncrementalInvalidationError(
        `Invalidation computation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private deduplicate(entries: InvalidationEntry[]): InvalidationEntry[] {
    const seen = new Set<string>();
    const result: InvalidationEntry[] = [];
    for (const e of entries) {
      const key = `${e.regionType}:${e.regionIdentifier}:${e.invalidationReason}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(e);
      }
    }
    return result;
  }
}
