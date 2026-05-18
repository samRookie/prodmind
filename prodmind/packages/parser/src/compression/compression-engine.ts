import type { CompressionInput, CompressionOutput } from './compression-types.ts';
import type { CompressionRulesConfig } from './compression-rules.ts';
import { FileCompressor } from './file-compressor.ts';
import { ModuleCompressor } from './module-compressor.ts';
import { RepositoryCompressor } from './repository-compressor.ts';
import { CompressionMetricsCalculator } from './compression-metrics.ts';
export class CompressionEngine {
  private readonly fileCompressor: FileCompressor;
  private readonly moduleCompressor: ModuleCompressor;
  private readonly repositoryCompressor: RepositoryCompressor;
  private readonly metricsCalculator: CompressionMetricsCalculator;

  public constructor(config?: Partial<CompressionRulesConfig>) {
    this.fileCompressor = new FileCompressor(config);
    this.moduleCompressor = new ModuleCompressor();
    this.repositoryCompressor = new RepositoryCompressor();
    this.metricsCalculator = new CompressionMetricsCalculator();
  }

  public compress(input: CompressionInput): CompressionOutput {
    const fileContexts = this.compressFiles(input);
    const moduleContexts = this.moduleCompressor.compress(fileContexts, input.resolution);
    const metrics = this.metricsCalculator.calculate(input, fileContexts, moduleContexts);
    const repositoryContext = this.repositoryCompressor.compress(fileContexts, moduleContexts, metrics, input.snapshotId);

    return {
      fileContexts,
      moduleContexts,
      repositoryContext,
      metrics,
    };
  }

  private compressFiles(input: CompressionInput): Map<string, import('./compression-types.ts').CompressedFileContext> {
    const fileContexts = new Map<string, import('./compression-types.ts').CompressedFileContext>();

    const successfulResults = input.parseResults
      .filter((r): r is { success: true; data: import('../types/ast.types.ts').ParsedFile } => r.success)
      .map((r) => r.data)
      .sort((a, b) => a.path.localeCompare(b.path));

    for (const parsedFile of successfulResults) {
      const fileHash = input.fileHashes.get(parsedFile.path) ?? null;
      const context = this.fileCompressor.compress(parsedFile, fileHash, input.resolution);
      fileContexts.set(parsedFile.path, context);
    }

    return fileContexts;
  }
}
