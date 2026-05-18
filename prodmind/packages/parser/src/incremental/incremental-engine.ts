import type { Database } from '@prodmind/db';
import { SnapshotRepository, GraphRepository, CompressionRepository } from '@prodmind/db';
import { SnapshotStatus } from '@prodmind/contracts';
import type { RepositoryManifest } from '../types/manifest.types.ts';
import { SnapshotDiffEngine } from './snapshot-diff-engine.ts';
import { GraphDiffEngine } from './graph-diff-engine.ts';
import { SemanticDiffEngine } from './semantic-diff-engine.ts';
import { CompressionDiffEngine } from './compression-diff-engine.ts';
import { DependencyImpactEngine } from './dependency-impact-engine.ts';
import { ReuseEngine } from './reuse-engine.ts';
import { InvalidationEngine } from './invalidation-engine.ts';
import { DiffMetricsCalculator } from './diff-metrics.ts';
import type { IncrementalInput, IncrementalOutput } from './diff-types.ts';
import { IncrementalError } from './diff-errors.ts';

export class IncrementalEngine {
  private readonly snapshots: SnapshotRepository;
  private readonly graph: GraphRepository;
  private readonly compression: CompressionRepository;
  private readonly snapshotDiffEngine: SnapshotDiffEngine;
  private readonly graphDiffEngine: GraphDiffEngine;
  private readonly semanticDiffEngine: SemanticDiffEngine;
  private readonly compressionDiffEngine: CompressionDiffEngine;
  private readonly dependencyImpactEngine: DependencyImpactEngine;
  private readonly reuseEngine: ReuseEngine;
  private readonly invalidationEngine: InvalidationEngine;
  private readonly metricsCalculator: DiffMetricsCalculator;

  public constructor(db: Database) {
    this.snapshots = new SnapshotRepository(db);
    this.graph = new GraphRepository(db);
    this.compression = new CompressionRepository(db);
    this.snapshotDiffEngine = new SnapshotDiffEngine();
    this.graphDiffEngine = new GraphDiffEngine();
    this.semanticDiffEngine = new SemanticDiffEngine();
    this.compressionDiffEngine = new CompressionDiffEngine();
    this.dependencyImpactEngine = new DependencyImpactEngine();
    this.reuseEngine = new ReuseEngine();
    this.invalidationEngine = new InvalidationEngine();
    this.metricsCalculator = new DiffMetricsCalculator();
  }

  public async analyze(input: IncrementalInput): Promise<IncrementalOutput> {
    try {
      const previousSnapshots = await this.snapshots.findByProjectId(input.projectId);
      const previousActive = previousSnapshots.find(
        (s) => s.status === SnapshotStatus.ACTIVE && s.id !== input.currentSnapshotId,
      );

      const baseSnapshotId = previousActive?.id ?? null;

      let previousManifest: RepositoryManifest | null = null;
      let previousNodes: Array<{ id: string; filePath: string; fileHash: string | null; nodeType: string; symbolName: string | null }> = [];
      let previousEdges: Array<{ id: string; sourceNodeId: string; targetNodeId: string; edgeType: string }> = [];
      const previousFileContexts = new Map<string, import('../compression/compression-types.ts').CompressedFileContext>();
      const previousModuleContexts = new Map<string, import('../compression/compression-types.ts').CompressedModuleContext>();
      let previousRepositoryContext: import('../compression/compression-types.ts').CompressedRepositoryContext | null = null;
      let previousMetrics: import('../compression/compression-types.ts').CompressionMetrics | null = null;

      if (baseSnapshotId) {
        const snap = await this.snapshots.findById(baseSnapshotId);
        if (snap?.metadataJson) {
          try {
            previousManifest = JSON.parse(snap.metadataJson) as RepositoryManifest;
          } catch {
            previousManifest = null;
          }
        }

        const graphData = await this.graph.getSnapshotGraph(baseSnapshotId);
        previousNodes = graphData.nodes.map((n) => ({
          id: n.id,
          filePath: n.filePath,
          fileHash: n.fileHash,
          nodeType: n.nodeType,
          symbolName: n.symbolName,
        }));
        previousEdges = graphData.edges.map((e) => ({
          id: e.id,
          sourceNodeId: e.sourceNodeId,
          targetNodeId: e.targetNodeId,
          edgeType: e.edgeType,
        }));

        const fileContextRows = await this.compression.getFileContextsBySnapshot(baseSnapshotId);
        for (const row of fileContextRows) {
          previousFileContexts.set(row.filePath, {
            filePath: row.filePath,
            purpose: row.purpose ?? '',
            language: row.language ?? '',
            symbols: row.symbolsJson ? JSON.parse(row.symbolsJson) : [],
            imports: row.importsJson ? JSON.parse(row.importsJson) : [],
            exports: row.exportsJson ? JSON.parse(row.exportsJson) : [],
            isAsync: row.isAsync,
            architecturalRole: row.architecturalRole ?? '',
            semanticClassification: row.semanticClassification ?? '',
            dependencyCount: row.dependencyCount,
            dependencyFilePaths: row.dependencyPathsJson ? JSON.parse(row.dependencyPathsJson) : [],
          });
        }

        const moduleContextRows = await this.compression.getModuleContextsBySnapshot(baseSnapshotId);
        for (const row of moduleContextRows) {
          previousModuleContexts.set(row.modulePath, {
            modulePath: row.modulePath,
            totalFiles: row.totalFiles,
            totalSymbols: row.totalSymbols,
            exportedSymbols: row.exportedSymbols,
            internalSymbols: row.internalSymbols,
            filePaths: row.filePathsJson ? JSON.parse(row.filePathsJson) : [],
            dependencyModulePaths: row.dependencyModulesJson ? JSON.parse(row.dependencyModulesJson) : [],
            dependentModulePaths: row.dependentModulesJson ? JSON.parse(row.dependentModulesJson) : [],
            couplingLevel: row.couplingLevel as 'high' | 'medium' | 'low' ?? 'low',
            boundaryType: row.boundaryType as 'core' | 'infrastructure' | 'shared' | 'isolated' ?? 'shared',
            topSymbols: row.topSymbolsJson ? JSON.parse(row.topSymbolsJson) : [],
          });
        }

        const repoContextRow = await this.compression.getRepositoryContextBySnapshot(baseSnapshotId);
        if (repoContextRow) {
          previousRepositoryContext = {
            snapshotId: repoContextRow.snapshotId,
            architectureSummary: repoContextRow.architectureSummary ?? '',
            totalFiles: repoContextRow.totalFiles,
            totalModules: repoContextRow.totalModules,
            totalSymbols: repoContextRow.totalSymbols,
            totalDependencies: repoContextRow.totalDependencies,
            languages: repoContextRow.languagesJson ? JSON.parse(repoContextRow.languagesJson) : [],
            modules: repoContextRow.modulesSummaryJson ? JSON.parse(repoContextRow.modulesSummaryJson) : [],
            dependencyTopologySummary: repoContextRow.dependencyTopologySummary ?? '',
            semanticDomainSummary: repoContextRow.semanticDomainSummary ?? '',
            infrastructureSummary: repoContextRow.infrastructureSummary ?? '',
            couplingHotspots: repoContextRow.couplingHotspotsJson ? JSON.parse(repoContextRow.couplingHotspotsJson) : [],
            isolatedSubsystems: repoContextRow.isolatedSubsystemsJson ? JSON.parse(repoContextRow.isolatedSubsystemsJson) : [],
            generatedAt: repoContextRow.generatedAt ?? '',
          };
        }

        const metricsRow = await this.compression.getMetricsBySnapshot(baseSnapshotId);
        if (metricsRow) {
          previousMetrics = {
            compressionRatio: metricsRow.compressionRatio ?? 1,
            tokenReductionRatio: metricsRow.tokenReductionRatio ?? 0,
            preservedDependencyCount: metricsRow.preservedDependencyCount,
            preservedSymbolCoverage: metricsRow.preservedSymbolCoverage ?? 1,
            preservedSemanticCoverage: metricsRow.preservedSemanticCoverage ?? 1,
            graphRetentionScore: metricsRow.graphRetentionScore ?? 1,
            compressionConsistencyScore: metricsRow.compressionConsistencyScore ?? 1,
            originalTokenCount: metricsRow.originalTokenCount,
            compressedTokenCount: metricsRow.compressedTokenCount,
            originalDependencyCount: metricsRow.originalDependencyCount,
            originalSymbolCount: metricsRow.originalSymbolCount,
            originalFileCount: metricsRow.originalFileCount,
            compressedDependencyCount: metricsRow.compressedDependencyCount,
            compressedSymbolCount: metricsRow.compressedSymbolCount,
          };
        }
      }

      const snapshotDiff = this.snapshotDiffEngine.diff(
        input.projectId,
        input.currentSnapshotId,
        previousManifest,
        {
          repositoryHash: '',
          totalFiles: input.fileContexts.size,
          hashedFiles: input.fileContexts.size,
          parseCandidates: input.fileContexts.size,
          ignoredFiles: [],
          retainedSourceBytes: 0,
          generatedAt: new Date().toISOString(),
          files: [...input.fileContexts.keys()].map((path) => ({
            path,
            sha256: input.currentFileHashes.get(path) ?? '',
            sizeBytes: 0,
            classification: '',
            shouldParse: true,
          })),
        },
      );
      snapshotDiff.baseSnapshotId = baseSnapshotId;

      const currentNodes = [...input.fileContexts.keys()].map((path, idx) => ({
        id: `node-${idx}`,
        filePath: path,
        fileHash: input.currentFileHashes.get(path) ?? null,
        nodeType: 'FILE',
        symbolName: null,
      }));

      const graphDiff = this.graphDiffEngine.diff(
        previousNodes,
        previousEdges,
        currentNodes,
        [],
      );

      const semanticDiff = this.semanticDiffEngine.diff(
        previousModuleContexts,
        input.moduleContexts,
        previousFileContexts,
        input.fileContexts,
      );

      const compressionDiff = this.compressionDiffEngine.diff(
        previousFileContexts,
        input.fileContexts,
        previousModuleContexts,
        input.moduleContexts,
        previousRepositoryContext,
        input.repositoryContext,
        previousMetrics,
        input.metrics,
      );

      const allChangedPaths = new Set([
        ...snapshotDiff.fileChanges.added,
        ...snapshotDiff.fileChanges.modified,
        ...snapshotDiff.fileChanges.removed,
      ]);

      const dependencyImpact = this.dependencyImpactEngine.compute(
        [...allChangedPaths],
        previousNodes,
        previousEdges,
        input.resolutionDependencies,
      );

      const reusePlan = this.reuseEngine.plan(
        graphDiff,
        compressionDiff,
        baseSnapshotId,
      );

      const invalidation = this.invalidationEngine.compute(
        graphDiff,
        semanticDiff,
        dependencyImpact,
      );

      const metrics = this.metricsCalculator.calculate(
        snapshotDiff,
        graphDiff,
        reusePlan,
        invalidation,
      );

      return {
        snapshotDiff,
        graphDiff,
        semanticDiff,
        compressionDiff,
        dependencyImpact,
        reusePlan,
        invalidation,
        metrics,
      };
    } catch (err) {
      throw new IncrementalError(
        `Incremental analysis failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
