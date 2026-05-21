import type { Database } from '@prodmind/db';
import { SnapshotRepository, EventRepository, CompressionRepository, SemanticRepository, CouplingRepository, DomainRepository, MetricsRepository, ValidationRepository } from '@prodmind/db';
import type { Snapshot, NewCompressedFileContextRow, NewCompressedModuleContextRow, NewCompressedRepositoryContextRow, NewCompressionMetricsRow } from '@prodmind/db';
import type { NewNode, NewEdge } from '@prodmind/db';
import { GraphRepository } from '@prodmind/db';
import { SnapshotStatus } from '@prodmind/contracts';
import type { Result } from '@prodmind/contracts';
import type { CompressionOutput, SemanticOutput, MetricRecord } from '@prodmind/parser';
import type { ValidationIssue } from '@prodmind/parser';

export class SnapshotPipeline {
  private readonly db: Database;
  private readonly snapshots: SnapshotRepository;
  private readonly graph: GraphRepository;
  private readonly events: EventRepository;
  private readonly compressionRepo: CompressionRepository;
  private readonly semanticRepo: SemanticRepository;
  private readonly couplingRepo: CouplingRepository;
  private readonly domainRepo: DomainRepository;
  private readonly metricsRepo: MetricsRepository;
  private readonly validationRepo: ValidationRepository;

  public constructor(db: Database) {
    this.db = db;
    this.snapshots = new SnapshotRepository(db);
    this.graph = new GraphRepository(db);
    this.events = new EventRepository(db);
    this.compressionRepo = new CompressionRepository(db);
    this.semanticRepo = new SemanticRepository(db);
    this.couplingRepo = new CouplingRepository(db);
    this.domainRepo = new DomainRepository(db);
    this.metricsRepo = new MetricsRepository(db);
    this.validationRepo = new ValidationRepository(db);
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
    const result = await this.graph.insertNodesAndEdges(snapshotId, nodeInputs, edgeInputs);
    if (!result.success) {
      return result;
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
      const repoInput = this.toRepositoryContextInput(output);
      const metricsInput = this.toMetricsInput(output);

      await this.db.transaction(async (tx) => {
        const fileResult = await this.compressionRepo.insertFileContexts(snapshotId, fileInputs, tx as unknown as Database);
        if (!fileResult.success) throw new Error(fileResult.error);

        const moduleResult = await this.compressionRepo.insertModuleContexts(snapshotId, moduleInputs, tx as unknown as Database);
        if (!moduleResult.success) throw new Error(moduleResult.error);

        const repoResult = await this.compressionRepo.insertRepositoryContext(snapshotId, repoInput, tx as unknown as Database);
        if (!repoResult.success) throw new Error(repoResult.error);

        const metricsResult = await this.compressionRepo.insertMetrics(snapshotId, metricsInput, tx as unknown as Database);
        if (!metricsResult.success) throw new Error(metricsResult.error);

        const ratioUpdate = await this.compressionRepo.updateSnapshotCompressionRatio(snapshotId, output.metrics.compressionRatio, tx as unknown as Database);
        if (!ratioUpdate.success) throw new Error(ratioUpdate.error);
      });

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

      const clusterInputs = output.domainClusters.map((c) => ({
        clusterName: c.clusterName,
        nodeIdsJson: JSON.stringify(c.nodeIds),
        cohesionScore: c.cohesionScore,
        fragmentationScore: c.fragmentationScore,
        boundaryMetadataJson: c.boundaryMetadataJson,
      }));

      const couplingInputs = output.couplingEdges.map((e) => ({
        sourceNodeId: e.sourceNodeId,
        targetNodeId: e.targetNodeId,
        couplingType: e.couplingType,
        couplingStrength: e.couplingStrength,
        propagationRisk: e.propagationRisk,
        metadataJson: e.metadataJson,
      }));

      await this.db.transaction(async (tx) => {
        const classResult = await this.semanticRepo.insertClassifications(snapshotId, classInputs, tx as unknown as Database);
        if (!classResult.success) throw new Error(classResult.error);

        const domainResult = await this.domainRepo.insertDomainClusters(snapshotId, clusterInputs, tx as unknown as Database);
        if (!domainResult.success) throw new Error(domainResult.error);

        const couplingResult = await this.couplingRepo.insertCouplingEdges(snapshotId, couplingInputs, tx as unknown as Database);
        if (!couplingResult.success) throw new Error(couplingResult.error);
      });

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

  public async commitRetrievalMetadata(
    snapshotId: string,
  ): Promise<Result<void, string>> {
    try {
      const nodeList = await this.graph.getNodesBySnapshot(snapshotId);
      const metrics = await this.metricsRepo.getMetricsByType('CENTRALITY', snapshotId);

      const topSeeds = metrics
        .filter((m) => m.nodeId)
        .slice(0, 10)
        .map((m) => m.nodeId!);

      const namespaceMap = new Map<string, string[]>();
      const symbolOwners: Array<{ symbolName: string; nodeIds: string[] }> = [];

      for (const n of nodeList) {
        const normalized = n.filePath.replace(/\\/g, '/');
        const parts = normalized.split('/');
        const namespace = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';
        const existing = namespaceMap.get(namespace) ?? [];
        existing.push(n.id);
        namespaceMap.set(namespace, existing);

        if (n.symbolName) {
          const existingSym = symbolOwners.find((s) => s.symbolName === n.symbolName);
          if (existingSym) {
            existingSym.nodeIds.push(n.id);
          } else {
            symbolOwners.push({ symbolName: n.symbolName, nodeIds: [n.id] });
          }
        }
      }

      const retrievalMetadata = {
        centralitySeeds: topSeeds,
        namespaceCount: namespaceMap.size,
        symbolOwnerCount: symbolOwners.length,
        namespaces: Array.from(namespaceMap.entries()).map(([ns, ids]) => ({
          namespace: ns,
          nodeCount: ids.length,
        })),
        generatedAt: new Date().toISOString(),
      };

      await this.snapshots.updateMetadata(
        snapshotId,
        JSON.stringify(retrievalMetadata),
      );

      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Retrieval metadata commit failed',
      };
    }
  }

  public async commitValidationResults(
    snapshotId: string,
    issues: ValidationIssue[],
    integrityScore: number,
    readinessScore: number,
    validationState: string,
  ): Promise<Result<void, string>> {
    try {
      const issueInserts = issues.map((i) => ({
        category: i.category,
        severity: i.severity,
        state: validationState,
        issueCode: i.issueCode,
        message: i.message,
        nodeId: i.nodeId,
        edgeId: i.edgeId,
        metadataJson: i.metadataJson,
      }));

      const issuesSaved = await this.validationRepo.insertValidationIssues(snapshotId, issueInserts);
      if (!issuesSaved) {
        return { success: false, error: 'Failed to insert validation issues' };
      }

      const criticalCount = issues.filter((i) => i.severity === 'CRITICAL').length;
      const warningCount = issues.filter((i) => i.severity === 'WARNING').length;

      const integritySaved = await this.validationRepo.insertSnapshotIntegrity(snapshotId, {
        integrityScore,
        readinessScore,
        validationState,
        criticalIssueCount: criticalCount,
        warningCount,
        metadataJson: null,
      });

      if (!integritySaved) {
        return { success: false, error: 'Failed to insert snapshot integrity' };
      }

      await this.events.log('validation_completed', {
        snapshotId,
        issueCount: issues.length,
        criticalCount,
        validationState,
        integrityScore,
        readinessScore,
      });

      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Validation commit failed',
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

    if (snapshot.status === SnapshotStatus.FAILED) return snapshot as Snapshot;

    await this.cleanupSnapshotData(snapshotId);

    const failed = await this.snapshots.markFailed(snapshotId);
    await this.events.log('snapshot_rollback', {
      snapshotId,
      projectId: snapshot.projectId,
      previousStatus: snapshot.status,
    });
    return failed;
  }

  private async cleanupSnapshotData(snapshotId: string): Promise<void> {
    try { await this.validationRepo.deleteSnapshotValidation(snapshotId); } catch {}
    try { await this.metricsRepo.deleteMetricsBySnapshot(snapshotId); } catch {}
    try { await this.couplingRepo.deleteBySnapshot(snapshotId); } catch {}
    try { await this.domainRepo.deleteBySnapshot(snapshotId); } catch {}
    try { await this.semanticRepo.deleteBySnapshot(snapshotId); } catch {}
    try { await this.compressionRepo.deleteBySnapshot(snapshotId); } catch {}
    try { await this.graph.deleteNodesBySnapshot(snapshotId); } catch {}
  }

  public findById(id: string): Promise<Snapshot | null> {
    return this.snapshots.findById(id);
  }
}
