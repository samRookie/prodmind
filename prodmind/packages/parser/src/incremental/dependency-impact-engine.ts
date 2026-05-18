import type { IncrementalDependencyImpactResult } from './diff-types.ts';
import { IncrementalDependencyImpactError } from './diff-errors.ts';

interface BaseNode {
  id: string;
  filePath: string;
}

interface BaseEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
}

export class DependencyImpactEngine {
  public compute(
    changedFilePaths: string[],
    previousNodes: BaseNode[],
    previousEdges: BaseEdge[],
    currentDependencies: Array<{ sourceFile: string; targetFile: string }>,
  ): IncrementalDependencyImpactResult {
    try {
      if (changedFilePaths.length === 0) {
        return {
          impactedNodeIds: [],
          impactedFilePaths: [],
          impactedModulePaths: [],
          transitiveImpactCount: 0,
          directImpactCount: 0,
          recomputationScope: 'none',
        };
      }

      const filePathToNodeIds = new Map<string, string[]>();
      for (const n of previousNodes) {
        const ids = filePathToNodeIds.get(n.filePath) ?? [];
        ids.push(n.id);
        filePathToNodeIds.set(n.filePath, ids);
      }

      const forwardAdj = new Map<string, string[]>();
      const backwardAdj = new Map<string, string[]>();
      for (const e of previousEdges) {
        const fwd = forwardAdj.get(e.sourceNodeId) ?? [];
        fwd.push(e.targetNodeId);
        forwardAdj.set(e.sourceNodeId, fwd);

        const bwd = backwardAdj.get(e.targetNodeId) ?? [];
        bwd.push(e.sourceNodeId);
        backwardAdj.set(e.targetNodeId, bwd);
      }

      const directlyChangedNodeIds = new Set<string>();
      for (const fp of changedFilePaths) {
        const ids = filePathToNodeIds.get(fp);
        if (ids) {
          for (const id of ids) directlyChangedNodeIds.add(id);
        }
      }

      const affectedNodeIds = new Set<string>(directlyChangedNodeIds);

      const queue = [...directlyChangedNodeIds];
      while (queue.length > 0) {
        const current = queue.pop()!;
        const dependents = backwardAdj.get(current);
        if (dependents) {
          for (const depId of dependents) {
            if (!affectedNodeIds.has(depId)) {
              affectedNodeIds.add(depId);
              queue.push(depId);
            }
          }
        }
      }

      const transitiveNodeIds = new Set<string>();
      for (const id of affectedNodeIds) {
        if (!directlyChangedNodeIds.has(id)) {
          transitiveNodeIds.add(id);
        }
      }

      const impactedFilePathsSet = new Set<string>(changedFilePaths);
      for (const id of transitiveNodeIds) {
        const node = previousNodes.find((n) => n.id === id);
        if (node) impactedFilePathsSet.add(node.filePath);
      }

      for (const dep of currentDependencies) {
        if (changedFilePaths.includes(dep.sourceFile)) {
          impactedFilePathsSet.add(dep.targetFile);
        }
        if (changedFilePaths.includes(dep.targetFile)) {
          impactedFilePathsSet.add(dep.sourceFile);
        }
      }

      const impactedFilePaths = [...impactedFilePathsSet].sort();

      const impactedModulePaths = this.extractModulePaths(impactedFilePaths);

      const directImpactCount = directlyChangedNodeIds.size;
      const transitiveImpactCount = transitiveNodeIds.size;

      let recomputationScope: 'none' | 'partial' | 'full';
      const totalNodes = previousNodes.length;
      if (totalNodes === 0) {
        recomputationScope = 'full';
      } else {
        const affectedRatio = affectedNodeIds.size / totalNodes;
        if (affectedRatio > 0.5) {
          recomputationScope = 'full';
        } else if (affectedNodeIds.size > 0) {
          recomputationScope = 'partial';
        } else {
          recomputationScope = 'none';
        }
      }

      return {
        impactedNodeIds: [...affectedNodeIds].sort(),
        impactedFilePaths,
        impactedModulePaths,
        directImpactCount,
        transitiveImpactCount,
        recomputationScope,
      };
    } catch (err) {
      throw new IncrementalDependencyImpactError(
        `Dependency impact computation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private extractModulePaths(filePaths: string[]): string[] {
    const moduleSet = new Set<string>();
    for (const fp of filePaths) {
      const parts = fp.replace(/\\/g, '/').split('/');
      if (parts.length >= 2) {
        moduleSet.add(`${parts[0]}/${parts[1]}`);
      }
    }
    return [...moduleSet].sort();
  }
}
