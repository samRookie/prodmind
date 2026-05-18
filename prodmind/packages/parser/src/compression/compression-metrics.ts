import type { CompressionInput, CompressionMetrics, CompressedFileContext, CompressedModuleContext } from './compression-types.ts';

export class CompressionMetricsCalculator {
  public calculate(
    input: CompressionInput,
    fileContexts: Map<string, CompressedFileContext>,
    moduleContexts: Map<string, CompressedModuleContext>,
  ): CompressionMetrics {
    const originalTokenCount = this.estimateTokenCount(input);
    const compressedTokenCount = this.estimateCompressedTokenCount(fileContexts, moduleContexts);

    const originalDependencyCount = this.countOriginalDependencies(input);
    const originalSymbolCount = this.countOriginalSymbols(input);
    const originalFileCount = this.countOriginalFiles(input);

    const compressedDependencyCount = this.countCompressedDependencies(fileContexts);
    const compressedSymbolCount = this.countCompressedSymbols(fileContexts);

    const tokenReductionRatio = originalTokenCount > 0
      ? (originalTokenCount - compressedTokenCount) / originalTokenCount
      : 0;

    const compressionRatio = originalTokenCount > 0
      ? compressedTokenCount / originalTokenCount
      : 1;

    const preservedDependencyCount = Math.min(compressedDependencyCount, originalDependencyCount);
    const preservedSymbolCoverage = originalSymbolCount > 0
      ? compressedSymbolCount / originalSymbolCount
      : 1;

    const preservedSemanticCoverage = this.computeSemanticCoverage(input, fileContexts);
    const graphRetentionScore = this.computeGraphRetention(input, fileContexts);
    const compressionConsistencyScore = this.computeConsistencyScore(fileContexts, moduleContexts);

    return {
      compressionRatio: Math.round(compressionRatio * 10000) / 10000,
      tokenReductionRatio: Math.round(tokenReductionRatio * 10000) / 10000,
      preservedDependencyCount,
      preservedSymbolCoverage: Math.round(preservedSymbolCoverage * 10000) / 10000,
      preservedSemanticCoverage: Math.round(preservedSemanticCoverage * 10000) / 10000,
      graphRetentionScore: Math.round(graphRetentionScore * 10000) / 10000,
      compressionConsistencyScore: Math.round(compressionConsistencyScore * 10000) / 10000,
      originalTokenCount,
      compressedTokenCount,
      originalDependencyCount,
      originalSymbolCount,
      originalFileCount,
      compressedDependencyCount,
      compressedSymbolCount,
    };
  }

  private estimateTokenCount(input: CompressionInput): number {
    let total = 0;
    for (const result of input.parseResults) {
      if (!result.success) continue;
      total += this.estimateObjectTokenCount(result.data);
    }
    if (input.resolution) {
      total += this.estimateObjectTokenCount(input.resolution);
    }
    return total;
  }

  private estimateCompressedTokenCount(
    fileContexts: Map<string, CompressedFileContext>,
    moduleContexts: Map<string, CompressedModuleContext>,
  ): number {
    let total = 0;
    for (const ctx of fileContexts.values()) {
      total += this.estimateObjectTokenCount(ctx);
    }
    for (const ctx of moduleContexts.values()) {
      total += this.estimateObjectTokenCount(ctx);
    }
    return total;
  }

  private estimateObjectTokenCount(obj: unknown): number {
    const json = JSON.stringify(obj);
    return json.length;
  }

  private countOriginalDependencies(input: CompressionInput): number {
    if (input.resolution) return input.resolution.dependencies.length;
    let count = 0;
    for (const result of input.parseResults) {
      if (!result.success) continue;
      count += result.data.imports.length;
    }
    return count;
  }

  private countOriginalSymbols(input: CompressionInput): number {
    let count = 0;
    for (const result of input.parseResults) {
      if (!result.success) continue;
      count += result.data.symbols.length;
    }
    return count;
  }

  private countOriginalFiles(input: CompressionInput): number {
    let count = 0;
    for (const result of input.parseResults) {
      if (result.success) count++;
    }
    return count;
  }

  private countCompressedDependencies(fileContexts: Map<string, CompressedFileContext>): number {
    let count = 0;
    for (const ctx of fileContexts.values()) {
      count += ctx.dependencyCount;
    }
    return count;
  }

  private countCompressedSymbols(fileContexts: Map<string, CompressedFileContext>): number {
    let count = 0;
    for (const ctx of fileContexts.values()) {
      count += ctx.symbols.length;
    }
    return count;
  }

  private computeSemanticCoverage(
    input: CompressionInput,
    fileContexts: Map<string, CompressedFileContext>,
  ): number {
    const classifiedFiles = new Set<string>();
    for (const result of input.parseResults) {
      if (result.success) classifiedFiles.add(result.data.path);
    }

    const compressedWithSemantics = new Set<string>();
    for (const ctx of fileContexts.values()) {
      if (ctx.semanticClassification !== 'shared' || ctx.architecturalRole !== 'module') {
        compressedWithSemantics.add(ctx.filePath);
      }
    }

    if (classifiedFiles.size === 0) return 1;
    return compressedWithSemantics.size / classifiedFiles.size;
  }

  private computeGraphRetention(
    input: CompressionInput,
    fileContexts: Map<string, CompressedFileContext>,
  ): number {
    if (!input.resolution || input.resolution.dependencies.length === 0) return 1;

    const compressedFiles = new Set(fileContexts.keys());
    let retainedDeps = 0;

    for (const dep of input.resolution.dependencies) {
      if (compressedFiles.has(dep.sourceFile) && compressedFiles.has(dep.targetFile)) {
        retainedDeps++;
      }
    }

    return retainedDeps / input.resolution.dependencies.length;
  }

  private computeConsistencyScore(
    fileContexts: Map<string, CompressedFileContext>,
    moduleContexts: Map<string, CompressedModuleContext>,
  ): number {
    let totalChecks = 0;
    let passedChecks = 0;

    for (const ctx of fileContexts.values()) {
      totalChecks++;
      if (ctx.filePath && ctx.symbols.length >= 0) {
        passedChecks++;
      }
    }

    for (const ctx of moduleContexts.values()) {
      totalChecks++;
      if (ctx.modulePath && ctx.totalFiles > 0) {
        passedChecks++;
      }
    }

    if (totalChecks === 0) return 1;
    return passedChecks / totalChecks;
  }
}
