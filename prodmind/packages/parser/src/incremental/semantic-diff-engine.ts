import type { CompressedModuleContext, CompressedFileContext } from '../compression/compression-types.ts';
import type { IncrementalSemanticDiffResult, SemanticDriftEntry } from './diff-types.ts';
import { IncrementalSemanticDiffError } from './diff-errors.ts';

export class SemanticDiffEngine {
  public diff(
    previousModuleContexts: Map<string, CompressedModuleContext>,
    currentModuleContexts: Map<string, CompressedModuleContext>,
    previousFileContexts: Map<string, CompressedFileContext>,
    currentFileContexts: Map<string, CompressedFileContext>,
  ): IncrementalSemanticDiffResult {
    try {
      const changedModulePaths: string[] = [];
      const unchangedModulePaths: string[] = [];
      const couplingDrift: SemanticDriftEntry[] = [];
      const boundaryDrift: SemanticDriftEntry[] = [];

      for (const [modulePath, current] of currentModuleContexts) {
        const previous = previousModuleContexts.get(modulePath);
        if (!previous) {
          changedModulePaths.push(modulePath);
          continue;
        }

        const couplingChanged = previous.couplingLevel !== current.couplingLevel;
        const boundaryChanged = previous.boundaryType !== current.boundaryType;
        const filesChanged = !this.arraysEqual(previous.filePaths, current.filePaths);
        const depsChanged = !this.arraysEqual(previous.dependencyModulePaths, current.dependencyModulePaths);

        if (couplingChanged || boundaryChanged || filesChanged || depsChanged) {
          changedModulePaths.push(modulePath);
          if (couplingChanged) {
            couplingDrift.push({
              modulePath,
              previousCoupling: previous.couplingLevel,
              currentCoupling: current.couplingLevel,
              previousBoundary: previous.boundaryType,
              currentBoundary: current.boundaryType,
            });
          }
          if (boundaryChanged) {
            boundaryDrift.push({
              modulePath,
              previousCoupling: previous.couplingLevel,
              currentCoupling: current.couplingLevel,
              previousBoundary: previous.boundaryType,
              currentBoundary: current.boundaryType,
            });
          }
        } else {
          unchangedModulePaths.push(modulePath);
        }
      }

      for (const [modulePath] of previousModuleContexts) {
        if (!currentModuleContexts.has(modulePath)) {
          changedModulePaths.push(modulePath);
        }
      }

      const classificationDrift: Array<{ filePath: string; from: string; to: string }> = [];
      for (const [filePath, current] of currentFileContexts) {
        const previous = previousFileContexts.get(filePath);
        if (previous && previous.semanticClassification !== current.semanticClassification) {
          classificationDrift.push({
            filePath,
            from: previous.semanticClassification,
            to: current.semanticClassification,
          });
        }
      }

      changedModulePaths.sort();
      unchangedModulePaths.sort();

      return {
        changedModulePaths,
        unchangedModulePaths,
        couplingDrift,
        boundaryDrift,
        classificationDrift,
        totalPreviousModules: previousModuleContexts.size,
        totalCurrentModules: currentModuleContexts.size,
        hasDrift: changedModulePaths.length > 0 || classificationDrift.length > 0,
      };
    } catch (err) {
      throw new IncrementalSemanticDiffError(
        `Semantic diff failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    for (let i = 0; i < sortedA.length; i++) {
      if (sortedA[i] !== sortedB[i]) return false;
    }
    return true;
  }
}
