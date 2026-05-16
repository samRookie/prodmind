import { readFile } from 'node:fs/promises';
import type { Database } from '@prodmind/db';
import { ProjectRepository, EventRepository } from '@prodmind/db';
import { ZipExtractor, FileDiscovery, Sha256Hasher, ManifestBuilder, batchParseFiles } from '@prodmind/parser';
import { DependencyResolver, GraphNormalizer } from '@prodmind/parser';
import { SnapshotStatus } from '@prodmind/contracts';
import { SnapshotPipeline } from './snapshot-pipeline.ts';
import { GraphBuilder } from './graph-builder.ts';
import type { IngestionResult, ParseStatistics } from './ingestion-types.ts';
import { IngestionPipelineError } from './ingestion-errors.ts';

export class IngestionService {
  private readonly projectRepo: ProjectRepository;
  private readonly pipeline: SnapshotPipeline;
  private readonly events: EventRepository;
  private readonly hasher: Sha256Hasher;
  private readonly discovery: FileDiscovery;
  private readonly manifestBuilder: ManifestBuilder;

  public constructor(db: Database) {
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

      await this.pipeline.transitionTo(snapshotId, SnapshotStatus.ANALYZING);

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
