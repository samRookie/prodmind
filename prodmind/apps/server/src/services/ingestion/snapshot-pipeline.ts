import type { Database } from '@prodmind/db';
import { SnapshotRepository, EventRepository, CompressionRepository, SemanticRepository, CouplingRepository, DomainRepository, MetricsRepository } from '@prodmind/db';
import type { Snapshot, NewCompressedFileContextRow, NewCompressedModuleContextRow, NewCompressedRepositoryContextRow, NewCompressionMetricsRow } from '@prodmind/db';
import type { NewNode, NewEdge } from '@prodmind/db';
import { GraphRepository } from '@prodmind/db';
import { SnapshotStatus } from '@prodmind/contracts';
import type { Result } from '@prodmind/contracts';
import type { CompressionOutput, SemanticOutput, MetricRecord } from '@prodmind/parser';

export class SnapshotPipeline {
  private readonly snapshots: SnapshotRepository;
  private readonly graph: GraphRepository;
  private readonly events: EventRepository;
  private readonly compressionRepo: CompressionRepository;
  private readonly semanticRepo: SemanticRepository;
  private readonly couplingRepo: CouplingRepository;
  private readonly domainRepo: DomainRepository;
  private readonly metricsRepo: MetricsRepository;

  public constructor(db: Database) {
    this.snapshots = new SnapshotRepository(db);
    this.graph = new GraphRepository(db);
    this.events = new EventRepository(db);
    this.compressionRepo = new CompressionRepository(db);
    this.semanticRepo = new SemanticRepository(db);
    this.couplingRepo = new CouplingRepository(db);
    this.domainRepo = new DomainRepository(db);
    this.metricsRepo = new MetricsRepository(db);
  }

  public async createSnapshot(
    projectId: string,
    uploadFilename?: string,
    uploadHash?: string,
  ): Promise<Snapshot> {
    return this.snapshots.create({ projectId, uploadFilename, uploadHash });
  }

  public async transitionTo(snapshotId: string, targetStatus: SnapshotStatus): Promise<Snapshot> {
    return this.snapshots.updateStatus(snapshotId, targetStatus);
  }

  public async markFailed(snapshotId: string, error: string): Promise<Snapshot> {
    await this.events.log('ingestion_failed', { snapshotId, error });
    return this.snapshots.markFailed(snapshotId);
  }

  public async markDegraded(snapshotId: string): Promise<Snapshot> {
    return this.snapshots.markDegraded(snapshotId);
  }

  public async commitGraph(
    snapshotId: string,
    nodeInputs: Omit<NewNode, 'id' | 'snapshotId' | 'createdAt'>[],
    edgeInputs: Omit<NewEdge, 'id' | 'snapshotId' | 'createdAt'>[],
  ): Promise<Result<void, string>> {
    const nodeResult = await this.graph.insertNodes(snapshotId, nodeInputs);
    if (!nodeResult.success) {
      return nodeResult;
    }

    const edgeResult = await this.graph.insertEdges(snapshotId, edgeInputs);
    if (!edgeResult.success) {
      return edgeResult;
    }

    return { success: true, data: undefined };
  }

  public async commitCompression(
    snapshotId: string,
    output: CompressionOutput,
  ): Promise<Result<void, string>> {
    try {
      const fileInputs = this.toFileContextInputs(output);
      const moduleInputs = this.toModuleContextInputs(output);

      const fileResult = await this.compressionRepo.insertFileContexts(snapshotId, fileInputs);
      if (!fileResult.success) return fileResult;

      const moduleResult = await this.compressionRepo.insertModuleContexts(snapshotId, moduleInputs);
      if (!moduleResult.success) return moduleResult;

      const repoInput = this.toRepositoryContextInput(output);
      const repoResult = await this.compressionRepo.insertRepositoryContext(snapshotId, repoInput);
      if (!repoResult.success) return repoResult;

      const metricsInput = this.toMetricsInput(output);
      const metricsResult = await this.compressionRepo.insertMetrics(snapshotId, metricsInput);
      if (!metricsResult.success) return metricsResult;

      const ratioUpdate = await this.compressionRepo.updateSnapshotCompressionRatio(snapshotId, output.metrics.compressionRatio);
      if (!ratioUpdate.success) return ratioUpdate;

      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Compression commit failed',
      };
    }
  }

  private toFileContextInputs(
    output: CompressionOutput,
  ): Omit<NewCompressedFileContextRow, 'id' | 'snapshotId' | 'createdAt'>[] {
    const inputs: Omit<NewCompressedFileContextRow, 'id' | 'snapshotId' | 'createdAt'>[] = [];
    const sortedPaths = [...output.fileContexts.keys()].sort();
    for (const filePath of sortedPaths) {
      const ctx = output.fileContexts.get(filePath)!;
      inputs.push({
        filePath: ctx.filePath,
        language: ctx.language,
        architecturalRole: ctx.architecturalRole,
        semanticClassification: ctx.semanticClassification,
        purpose: ctx.purpose,
        isAsync: ctx.isAsync,
        dependencyCount: ctx.dependencyCount,
        symbolsJson: JSON.stringify(ctx.symbols),
        importsJson: JSON.stringify(ctx.imports),
        exportsJson: JSON.stringify(ctx.exports),
        dependencyPathsJson: JSON.stringify(ctx.dependencyFilePaths),
      });
    }
    return inputs;
  }

  private toModuleContextInputs(
    output: CompressionOutput,
  ): Omit<NewCompressedModuleContextRow, 'id' | 'snapshotId' | 'createdAt'>[] {
    const inputs: Omit<NewCompressedModuleContextRow, 'id' | 'snapshotId' | 'createdAt'>[] = [];
    const sortedPaths = [...output.moduleContexts.keys()].sort();
    for (const modulePath of sortedPaths) {
      const ctx = output.moduleContexts.get(modulePath)!;
      inputs.push({
        modulePath: ctx.modulePath,
        totalFiles: ctx.totalFiles,
        totalSymbols: ctx.totalSymbols,
        exportedSymbols: ctx.exportedSymbols,
        internalSymbols: ctx.internalSymbols,
        couplingLevel: ctx.couplingLevel,
        boundaryType: ctx.boundaryType,
        filePathsJson: JSON.stringify(ctx.filePaths),
        dependencyModulesJson: JSON.stringify(ctx.dependencyModulePaths),
        dependentModulesJson: JSON.stringify(ctx.dependentModulePaths),
        topSymbolsJson: JSON.stringify(ctx.topSymbols),
      });
    }
    return inputs;
  }

  private toRepositoryContextInput(
    output: CompressionOutput,
  ): Omit<NewCompressedRepositoryContextRow, 'id' | 'snapshotId' | 'createdAt'> {
    const ctx = output.repositoryContext;
    return {
      architectureSummary: ctx.architectureSummary,
      dependencyTopologySummary: ctx.dependencyTopologySummary,
      semanticDomainSummary: ctx.semanticDomainSummary,
      infrastructureSummary: ctx.infrastructureSummary,
      totalFiles: ctx.totalFiles,
      totalModules: ctx.totalModules,
      totalSymbols: ctx.totalSymbols,
      totalDependencies: ctx.totalDependencies,
      languagesJson: JSON.stringify(ctx.languages),
      modulesSummaryJson: JSON.stringify(ctx.modules),
      couplingHotspotsJson: JSON.stringify(ctx.couplingHotspots),
      isolatedSubsystemsJson: JSON.stringify(ctx.isolatedSubsystems),
      generatedAt: ctx.generatedAt,
    };
  }

  private toMetricsInput(
    output: CompressionOutput,
  ): Omit<NewCompressionMetricsRow, 'id' | 'snapshotId' | 'createdAt'> {
    const m = output.metrics;
    return {
      compressionRatio: m.compressionRatio,
      tokenReductionRatio: m.tokenReductionRatio,
      preservedDependencyCount: m.preservedDependencyCount,
      preservedSymbolCoverage: m.preservedSymbolCoverage,
      preservedSemanticCoverage: m.preservedSemanticCoverage,
      graphRetentionScore: m.graphRetentionScore,
      compressionConsistencyScore: m.compressionConsistencyScore,
      originalTokenCount: m.originalTokenCount,
      compressedTokenCount: m.compressedTokenCount,
      originalDependencyCount: m.originalDependencyCount,
      originalSymbolCount: m.originalSymbolCount,
      originalFileCount: m.originalFileCount,
      compressedDependencyCount: m.compressedDependencyCount,
      compressedSymbolCount: m.compressedSymbolCount,
    };
  }

  public async commitSemantic(
    snapshotId: string,
    output: SemanticOutput,
  ): Promise<Result<void, string>> {
    try {
      const classInputs = output.classifications.map((c) => ({
        nodeId: c.nodeId,
        semanticType: c.semanticType,
        ruleStrength: c.ruleStrength,
        classificationReasonsJson: JSON.stringify(c.classificationReasons),
        matchedHeuristicsJson: JSON.stringify(c.matchedHeuristics),
        infraScore: null as number | null,
        businessScore: null as number | null,
        dominantRole: null as string | null,
      }));

      for (let i = 0; i < output.classifications.length; i++) {
        const infra = output.infraBusinessResults[i];
        if (infra) {
          classInputs[i]!.infraScore = infra.infraScore;
          classInputs[i]!.businessScore = infra.businessScore;
          classInputs[i]!.dominantRole = infra.dominantRole;
        }
      }

      const classResult = await this.semanticRepo.insertClassifications(snapshotId, classInputs);
      if (!classResult.success) return classResult;

      const clusterInputs = output.domainClusters.map((c) => ({
        clusterName: c.clusterName,
        nodeIdsJson: JSON.stringify(c.nodeIds),
        cohesionScore: c.cohesionScore,
        fragmentationScore: c.fragmentationScore,
        boundaryMetadataJson: c.boundaryMetadataJson,
      }));

      const domainResult = await this.domainRepo.insertDomainClusters(snapshotId, clusterInputs);
      if (!domainResult.success) return domainResult;

      const couplingInputs = output.couplingEdges.map((e) => ({
        sourceNodeId: e.sourceNodeId,
        targetNodeId: e.targetNodeId,
        couplingType: e.couplingType,
        couplingStrength: e.couplingStrength,
        propagationRisk: e.propagationRisk,
        metadataJson: e.metadataJson,
      }));

      const couplingResult = await this.couplingRepo.insertCouplingEdges(snapshotId, couplingInputs);
      if (!couplingResult.success) return couplingResult;

      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Semantic commit failed',
      };
    }
  }

  public async commitMetrics(
    snapshotId: string,
    records: MetricRecord[],
  ): Promise<Result<void, string>> {
    try {
      const result = await this.metricsRepo.insertMetrics(snapshotId, records);
      if (!result.success) return result;
      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Metrics commit failed',
      };
    }
  }

  public async activateSnapshot(snapshotId: string): Promise<Result<Snapshot, string>> {
    const result = await this.snapshots.activateSnapshotWithValidation(snapshotId);
    if (result.success) {
      await this.events.log('snapshot_activated', { snapshotId });
    }
    return result;
  }

  public async rollbackSnapshot(snapshotId: string): Promise<Snapshot> {
    const snapshot = await this.snapshots.findById(snapshotId);
    if (!snapshot) throw new Error(`Snapshot ${snapshotId} not found for rollback`);

    const failed = await this.snapshots.markFailed(snapshotId);
    await this.events.log('snapshot_rollback', {
      snapshotId,
      projectId: snapshot.projectId,
      previousStatus: snapshot.status,
    });
    return failed;
  }

  public findById(id: string): Promise<Snapshot | null> {
    return this.snapshots.findById(id);
  }
}
