import { readFile } from 'node:fs/promises';
import type { Database } from '@prodmind/db';
import { ProjectRepository, EventRepository } from '@prodmind/db';
import { ZipExtractor, FileDiscovery, Sha256Hasher, ManifestBuilder, batchParseFiles, CompressionEngine } from '@prodmind/parser';
import { DependencyResolver, GraphNormalizer, SemanticEngine, MetricsEngine, IntegrityEngine } from '@prodmind/parser';
import type { SemanticOutput, MetricsOutput } from '@prodmind/parser';
import { SnapshotStatus, ValidationState } from '@prodmind/contracts';
import { SnapshotPipeline } from './snapshot-pipeline.ts';
import { GraphBuilder } from './graph-builder.ts';
import { IncrementalService } from './incremental-service.ts';
import type { IngestionResult, ParseStatistics } from './ingestion-types.ts';
import { IngestionPipelineError } from './ingestion-errors.ts';

export class IngestionService {
  private readonly db: Database;
  private readonly projectRepo: ProjectRepository;
  private readonly pipeline: SnapshotPipeline;
  private readonly events: EventRepository;
  private readonly hasher: Sha256Hasher;
  private readonly discovery: FileDiscovery;
  private readonly manifestBuilder: ManifestBuilder;

  public constructor(db: Database) {
    this.db = db;
    this.projectRepo = new ProjectRepository(db);
    this.pipeline = new SnapshotPipeline(db);
    this.events = new EventRepository(db);
    this.hasher = new Sha256Hasher();
    this.discovery = new FileDiscovery();
    this.manifestBuilder = new ManifestBuilder();
  }

  public async ingest(
    zipPath: string,
    projectName: string,
    description?: string,
  ): Promise<IngestionResult> {
    const startWall = Date.now();

    let projectId: string | undefined;
    let snapshotId: string | undefined;
    let workspacePath: string | undefined;
    let resolution: import('@prodmind/parser').ResolutionResult | undefined;

    try {
      const project = await this.projectRepo.create({ name: projectName, description });
      projectId = project.id;

      await this.events.log('upload_started', { projectId, filename: zipPath.split('/').pop()?.split('\\').pop() });

      const snapshot = await this.pipeline.createSnapshot(projectId, zipPath.split('/').pop()?.split('\\').pop());
      snapshotId = snapshot.id;

      await this.pipeline.transitionTo(snapshotId, SnapshotStatus.UPLOADING);
      await this.events.log('upload_completed', { projectId, snapshotId });

      await this.pipeline.transitionTo(snapshotId, SnapshotStatus.EXTRACTING);
      await this.events.log('extraction_started', { snapshotId });

      const extractor = new ZipExtractor();
      const extractionResult = await extractor.extract(zipPath);
      workspacePath = extractionResult.extractionPath;

      await this.events.log('extraction_completed', {
        snapshotId,
        fileCount: extractionResult.extractedFiles,
        byteCount: extractionResult.extractedBytes,
      });

      await this.pipeline.transitionTo(snapshotId, SnapshotStatus.PARSING);
      await this.events.log('parsing_started', { snapshotId });

      const discovered = await this.discovery.discover(workspacePath);
      const hashInputs = discovered.map((f) => ({ path: f.path, absolutePath: f.absolutePath }));
      const hashes = await this.hasher.hashFiles(hashInputs);

      const fileHashMap = new Map<string, string>();
      for (const h of hashes) {
        fileHashMap.set(h.path, h.sha256);
      }

      const manifest = this.manifestBuilder.build(discovered, hashes);

      const parseCandidates = discovered.filter((f) => f.shouldParse);
      const parseInputs: Array<{ path: string; source: string }> = [];
      for (const candidate of parseCandidates) {
        const source = await readFile(candidate.absolutePath, 'utf-8');
        parseInputs.push({ path: candidate.path, source });
      }

      const parseResults = await batchParseFiles(parseInputs, { timeoutPerFile: 30_000 });

      const succeeded: string[] = [];
      const failedFiles: Array<{ path: string; error: string }> = [];
      let skipped = 0;

      for (const r of parseResults) {
        if (r.success) {
          succeeded.push(r.data.path);
        } else if (r.errorType === 'UNSUPPORTED') {
          skipped++;
        } else {
          failedFiles.push({ path: r.path, error: r.error });
        }
      }

      const parseStats: ParseStatistics = {
        total: parseResults.length,
        succeeded: succeeded.length,
        failed: failedFiles.length,
        skipped,
      };

      await this.events.log('parsing_completed', {
        snapshotId,
        parseStats,
      });

      const allFilePaths = parseCandidates.map((f) => f.path);
      const successfulParsedFiles = parseResults.filter((r): r is { success: true; data: import('@prodmind/parser').ParsedFile } => r.success).map((r) => r.data);
      if (successfulParsedFiles.length > 0) {
        const resolver = new DependencyResolver(successfulParsedFiles, allFilePaths);
        const rawResolution = resolver.resolve();
        const normalizer = new GraphNormalizer();
        resolution = normalizer.normalize(rawResolution);

        await this.events.log('dependency_resolution_completed', {
          snapshotId,
          resolvedDeps: resolution.dependencies.length,
          unresolvedImports: resolution.unresolvedImports.length,
          exportConflicts: resolution.exportConflicts.length,
        });
      }

      await this.events.log('graph_persist_started', { snapshotId });

      const graphBuilder = new GraphBuilder(snapshotId);
      const graph = graphBuilder.build({ parseResults, fileHashes: fileHashMap, resolution });

      const commitResult = await this.pipeline.commitGraph(snapshotId, graph.nodes, graph.edges);
      if (!commitResult.success) {
        throw new IngestionPipelineError('graph_persist', commitResult.error);
      }

      await this.events.log('graph_persist_completed', {
        snapshotId,
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
      });

      let semanticOutput: SemanticOutput | undefined;
      try {
        const engine = new SemanticEngine();
        const semanticNodes = graph.nodes.map((n) => ({
          id: n.id,
          filePath: n.filePath,
          fileHash: n.fileHash ?? null,
          nodeType: n.nodeType,
          symbolName: n.symbolName ?? null,
          language: n.language ?? null,
          metadataJson: n.metadataJson ?? null,
        }));
        const semanticEdges = graph.edges.map((e) => ({
          id: e.id,
          sourceNodeId: e.sourceNodeId,
          targetNodeId: e.targetNodeId,
          edgeType: e.edgeType,
          weight: e.weight ?? null,
          metadataJson: e.metadataJson ?? null,
        }));
        semanticOutput = engine.analyze({
          parseResults,
          resolution,
          nodes: semanticNodes,
          edges: semanticEdges,
          fileHashes: fileHashMap,
          snapshotId,
        });
        const semanticResult = await this.pipeline.commitSemantic(snapshotId, semanticOutput);
        if (semanticResult.success) {
          await this.events.log('semantic_completed', {
            snapshotId,
            classifiedCount: semanticOutput.classifications.length,
            couplingCount: semanticOutput.couplingEdges.length,
            clusterCount: semanticOutput.domainClusters.length,
          });
        } else {
          await this.events.log('semantic_warning', {
            snapshotId,
            error: semanticResult.error,
          });
        }
      } catch (semanticErr) {
        await this.events.log('semantic_warning', {
          snapshotId,
          error: semanticErr instanceof Error ? semanticErr.message : String(semanticErr),
        });
      }

      await this.pipeline.transitionTo(snapshotId, SnapshotStatus.ANALYZING);

      let compressionRatio: number | undefined;
      let latestCompressionOutput: import('@prodmind/parser').CompressionOutput | undefined;
      try {
        const compressionEngine = new CompressionEngine();
        const compressionOutput = compressionEngine.compress({
          parseResults,
          fileHashes: fileHashMap,
          resolution,
          snapshotId,
        });
        latestCompressionOutput = compressionOutput;

        const commitCompressionResult = await this.pipeline.commitCompression(snapshotId, compressionOutput);
        if (commitCompressionResult.success) {
          compressionRatio = compressionOutput.metrics.compressionRatio;
          await this.events.log('compression_completed', {
            snapshotId,
            compressionRatio: compressionOutput.metrics.compressionRatio,
            tokenReductionRatio: compressionOutput.metrics.tokenReductionRatio,
          });
        } else {
          await this.events.log('compression_warning', {
            snapshotId,
            error: commitCompressionResult.error,
          });
        }
      } catch (compressionErr) {
        await this.events.log('compression_warning', {
          snapshotId,
          error: compressionErr instanceof Error ? compressionErr.message : String(compressionErr),
        });
      }

      if (latestCompressionOutput) {
        const incrementalService = new IncrementalService(this.db);
        const deps = resolution?.dependencies.map((d) => ({
          sourceFile: d.sourceFile,
          targetFile: d.targetFile,
        })) ?? [];
        await incrementalService.analyze(
          projectId,
          snapshotId,
          latestCompressionOutput,
          fileHashMap,
          deps,
        );
      }

      let metricsOutput: MetricsOutput | undefined;
      try {
        const metricsEngine = new MetricsEngine();
        metricsOutput = metricsEngine.analyze({
          nodes: graph.nodes.map((n) => ({
            id: n.id,
            filePath: n.filePath,
            fileHash: n.fileHash ?? null,
            nodeType: n.nodeType,
            symbolName: n.symbolName ?? null,
            language: n.language ?? null,
            metadataJson: n.metadataJson ?? null,
          })),
          edges: graph.edges.map((e) => ({
            id: e.id,
            sourceNodeId: e.sourceNodeId,
            targetNodeId: e.targetNodeId,
            edgeType: e.edgeType,
            weight: e.weight ?? null,
            metadataJson: e.metadataJson ?? null,
          })),
          snapshotId,
          semanticClassifications: semanticOutput?.classifications,
        });
        const metricResult = await this.pipeline.commitMetrics(snapshotId, metricsOutput.records);
        if (metricResult.success) {
          await this.events.log('metrics_completed', {
            snapshotId,
            recordCount: metricsOutput.records.length,
          });
        } else {
          await this.events.log('metrics_warning', {
            snapshotId,
            error: metricResult.error,
          });
        }
      } catch (metricsErr) {
        await this.events.log('metrics_warning', {
          snapshotId,
          error: metricsErr instanceof Error ? metricsErr.message : String(metricsErr),
        });
      }

      try {
        const retrievalResult = await this.pipeline.commitRetrievalMetadata(snapshotId);
        if (retrievalResult.success) {
          await this.events.log('retrieval_metadata_completed', { snapshotId });
        }
      } catch (retrievalErr) {
        await this.events.log('retrieval_metadata_warning', {
          snapshotId,
          error: retrievalErr instanceof Error ? retrievalErr.message : String(retrievalErr),
        });
      }

      let validationState = ValidationState.DEGRADED;
      let integrityScore = 0;
      let readinessScore = 0;
      let validationIssueCount = 0;
      let validationBlocked = false;

      try {
        const engine = new IntegrityEngine();
        const validationInput = {
          snapshotId,
          nodes: graph.nodes.map((n) => ({
            id: n.id,
            filePath: n.filePath,
            fileHash: n.fileHash ?? null,
            nodeType: n.nodeType,
            symbolName: n.symbolName ?? null,
            language: n.language ?? null,
            metadataJson: n.metadataJson ?? null,
          })),
          edges: graph.edges.map((e) => ({
            id: e.id,
            sourceNodeId: e.sourceNodeId,
            targetNodeId: e.targetNodeId,
            edgeType: e.edgeType,
            weight: e.weight ?? null,
            metadataJson: e.metadataJson ?? null,
          })),
          classifications: semanticOutput?.classifications,
          domainClusters: semanticOutput?.domainClusters,
          centrality: metricsOutput?.centrality,
          instability: metricsOutput?.instability,
          propagationRisk: metricsOutput?.propagationRisk,
          fanMetrics: metricsOutput?.fanMetrics,
          complexity: metricsOutput?.complexity,
          retrievalAvailable: true,
          compressionAvailable: latestCompressionOutput != null,
        };

        const validationOutput = engine.validate(validationInput);
        validationIssueCount = validationOutput.issues.length;
        validationState = validationOutput.snapshotResult.validationState;
        integrityScore = validationOutput.snapshotResult.integrityScore;
        readinessScore = validationOutput.snapshotResult.readinessScore;

        const persistResult = await this.pipeline.commitValidationResults(
          snapshotId,
          validationOutput.issues,
          integrityScore,
          readinessScore,
          validationState,
        );

        if (persistResult.success) {
          await this.events.log('validation_completed', {
            snapshotId,
            issueCount: validationIssueCount,
            validationState,
            integrityScore,
            readinessScore,
          });
        }

        if (validationState === ValidationState.INVALID) {
          validationBlocked = true;
          await this.events.log('validation_blocked', {
            snapshotId,
            reason: 'CRITICAL validation issues found',
            criticalCount: validationOutput.summary.criticalCount,
          });
        }
      } catch (validationErr) {
        await this.events.log('validation_warning', {
          snapshotId,
          error: validationErr instanceof Error ? validationErr.message : String(validationErr),
        });
      }

      if (validationBlocked) {
        await this.pipeline.markDegraded(snapshotId);
        const durationMs = Date.now() - startWall;
        return {
          success: true,
          projectId,
          snapshotId,
          fileCount: manifest.totalFiles,
          nodeCount: graph.nodes.length,
          edgeCount: graph.edges.length,
          parseStatistics: parseStats,
          failedFiles,
          durationMs,
          snapshotStatus: SnapshotStatus.DEGRADED,
          compressionRatio,
          semanticClassifiedCount: semanticOutput?.classifications.length,
          couplingEdgeCount: semanticOutput?.couplingEdges.length,
          domainClusterCount: semanticOutput?.domainClusters.length,
          graphMetricsCount: metricsOutput?.records.length,
        };
      }

      const activation = await this.pipeline.activateSnapshot(snapshotId);
      if (!activation.success) {
        await this.pipeline.markDegraded(snapshotId);
      }

      const durationMs = Date.now() - startWall;

      return {
        success: true,
        projectId,
        snapshotId,
        fileCount: manifest.totalFiles,
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        parseStatistics: parseStats,
        failedFiles,
        durationMs,
        snapshotStatus: activation.success ? SnapshotStatus.ACTIVE : SnapshotStatus.DEGRADED,
        compressionRatio,
        semanticClassifiedCount: semanticOutput?.classifications.length,
        couplingEdgeCount: semanticOutput?.couplingEdges.length,
        domainClusterCount: semanticOutput?.domainClusters.length,
        graphMetricsCount: metricsOutput?.records.length,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const stage = err instanceof IngestionPipelineError ? err.stage : 'unknown';

      if (snapshotId) {
        try {
          await this.pipeline.rollbackSnapshot(snapshotId);
        } catch {
          // best-effort rollback
        }
      }

      return {
        success: false,
        projectId: projectId ?? '',
        snapshotId: snapshotId ?? '',
        error: errorMessage,
        stage,
      };
    }
  }
}
