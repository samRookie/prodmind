import type { CompressedFileContext, CompressedModuleContext, CompressedRepositoryContext, CompressionMetrics } from '../compression/compression-types.ts';
import type { IncrementalCompressionDiffResult } from './diff-types.ts';
import { IncrementalCompressionDiffError } from './diff-errors.ts';

export class CompressionDiffEngine {
  public diff(
    previousFileContexts: Map<string, CompressedFileContext>,
    currentFileContexts: Map<string, CompressedFileContext>,
    previousModuleContexts: Map<string, CompressedModuleContext>,
    currentModuleContexts: Map<string, CompressedModuleContext>,
    previousRepositoryContext: CompressedRepositoryContext | null,
    currentRepositoryContext: CompressedRepositoryContext,
    previousMetrics: CompressionMetrics | null,
    currentMetrics: CompressionMetrics,
  ): IncrementalCompressionDiffResult {
    try {
      const reusableFileContextPaths: string[] = [];
      const invalidFileContextPaths: string[] = [];

      for (const [filePath, current] of currentFileContexts) {
        const previous = previousFileContexts.get(filePath);
        if (!previous) {
          invalidFileContextPaths.push(filePath);
          continue;
        }
        if (this.fileContextsEqual(previous, current)) {
          reusableFileContextPaths.push(filePath);
        } else {
          invalidFileContextPaths.push(filePath);
        }
      }

      for (const [filePath] of previousFileContexts) {
        if (!currentFileContexts.has(filePath)) {
          invalidFileContextPaths.push(filePath);
        }
      }

      const reusableModuleContextPaths: string[] = [];
      const invalidModuleContextPaths: string[] = [];

      for (const [modulePath, current] of currentModuleContexts) {
        const previous = previousModuleContexts.get(modulePath);
        if (!previous) {
          invalidModuleContextPaths.push(modulePath);
          continue;
        }
        if (this.moduleContextsEqual(previous, current)) {
          reusableModuleContextPaths.push(modulePath);
        } else {
          invalidModuleContextPaths.push(modulePath);
        }
      }

      for (const [modulePath] of previousModuleContexts) {
        if (!currentModuleContexts.has(modulePath)) {
          invalidModuleContextPaths.push(modulePath);
        }
      }

      reusableFileContextPaths.sort();
      invalidFileContextPaths.sort();
      reusableModuleContextPaths.sort();
      invalidModuleContextPaths.sort();

      const repositoryContextChanged = previousRepositoryContext
        ? !this.repositoryContextsEqual(previousRepositoryContext, currentRepositoryContext)
        : true;

      const metricsChanged = previousMetrics
        ? !this.metricsEqual(previousMetrics, currentMetrics)
        : true;

      return {
        reusableFileContextPaths,
        invalidFileContextPaths,
        reusableModuleContextPaths,
        invalidModuleContextPaths,
        repositoryContextChanged,
        metricsChanged,
        totalPreviousFileContexts: previousFileContexts.size,
        totalCurrentFileContexts: currentFileContexts.size,
        hasChanges: invalidFileContextPaths.length > 0 || invalidModuleContextPaths.length > 0 || repositoryContextChanged || metricsChanged,
      };
    } catch (err) {
      throw new IncrementalCompressionDiffError(
        `Compression diff failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private fileContextsEqual(a: CompressedFileContext, b: CompressedFileContext): boolean {
    if (a.filePath !== b.filePath) return false;
    if (a.language !== b.language) return false;
    if (a.architecturalRole !== b.architecturalRole) return false;
    if (a.semanticClassification !== b.semanticClassification) return false;
    if (a.purpose !== b.purpose) return false;
    if (a.isAsync !== b.isAsync) return false;
    if (a.dependencyCount !== b.dependencyCount) return false;
    if (!this.arraysEqual(a.dependencyFilePaths, b.dependencyFilePaths)) return false;
    if (!this.symbolArraysEqual(a.symbols, b.symbols)) return false;
    if (!this.importArraysEqual(a.imports, b.imports)) return false;
    if (!this.exportArraysEqual(a.exports, b.exports)) return false;
    return true;
  }

  private moduleContextsEqual(a: CompressedModuleContext, b: CompressedModuleContext): boolean {
    if (a.modulePath !== b.modulePath) return false;
    if (a.totalFiles !== b.totalFiles) return false;
    if (a.totalSymbols !== b.totalSymbols) return false;
    if (a.exportedSymbols !== b.exportedSymbols) return false;
    if (a.internalSymbols !== b.internalSymbols) return false;
    if (a.couplingLevel !== b.couplingLevel) return false;
    if (a.boundaryType !== b.boundaryType) return false;
    return true;
  }

  private repositoryContextsEqual(a: CompressedRepositoryContext, b: CompressedRepositoryContext): boolean {
    return (
      a.totalFiles === b.totalFiles &&
      a.totalModules === b.totalModules &&
      a.totalSymbols === b.totalSymbols &&
      a.totalDependencies === b.totalDependencies &&
      a.architectureSummary === b.architectureSummary &&
      a.dependencyTopologySummary === b.dependencyTopologySummary &&
      a.semanticDomainSummary === b.semanticDomainSummary &&
      a.infrastructureSummary === b.infrastructureSummary
    );
  }

  private metricsEqual(a: CompressionMetrics, b: CompressionMetrics): boolean {
    return (
      a.compressionRatio === b.compressionRatio &&
      a.tokenReductionRatio === b.tokenReductionRatio &&
      a.preservedDependencyCount === b.preservedDependencyCount &&
      a.preservedSymbolCoverage === b.preservedSymbolCoverage &&
      a.preservedSemanticCoverage === b.preservedSemanticCoverage &&
      a.originalTokenCount === b.originalTokenCount &&
      a.compressedTokenCount === b.compressedTokenCount
    );
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

  private symbolArraysEqual(
    a: Array<{ id: string; name: string; type: string; visibility: string; isAsync: boolean; dependencyCount: number; centralityScore: number }>,
    b: Array<{ id: string; name: string; type: string; visibility: string; isAsync: boolean; dependencyCount: number; centralityScore: number }>,
  ): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const ai = a[i]!;
      const bi = b[i]!;
      if (
        ai.name !== bi.name ||
        ai.type !== bi.type ||
        ai.visibility !== bi.visibility ||
        ai.isAsync !== bi.isAsync ||
        ai.dependencyCount !== bi.dependencyCount
      ) return false;
    }
    return true;
  }

  private importArraysEqual(
    a: Array<{ source: string; specifiers: string[]; isExternal: boolean }>,
    b: Array<{ source: string; specifiers: string[]; isExternal: boolean }>,
  ): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const ai = a[i]!;
      const bi = b[i]!;
      if (ai.source !== bi.source || ai.isExternal !== bi.isExternal) return false;
      if (!this.arraysEqual(ai.specifiers, bi.specifiers)) return false;
    }
    return true;
  }

  private exportArraysEqual(
    a: Array<{ name: string; isDefault: boolean }>,
    b: Array<{ name: string; isDefault: boolean }>,
  ): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const ai = a[i]!;
      const bi = b[i]!;
      if (ai.name !== bi.name || ai.isDefault !== bi.isDefault) return false;
    }
    return true;
  }
}
