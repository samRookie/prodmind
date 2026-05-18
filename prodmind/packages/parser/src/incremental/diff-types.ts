import type { CompressedFileContext, CompressedModuleContext, CompressedRepositoryContext, CompressionMetrics } from '../compression/compression-types.ts';

export interface FileChangeSet {
  added: string[];
  removed: string[];
  modified: string[];
  unchanged: string[];
}

export interface IncrementalSnapshotDiffResult {
  projectId: string;
  baseSnapshotId: string | null;
  currentSnapshotId: string;
  fileChanges: FileChangeSet;
  totalPreviousFiles: number;
  totalCurrentFiles: number;
  hasChanges: boolean;
}

export interface NodeRef {
  id: string;
  filePath: string;
  fileHash: string | null;
  nodeType: string;
  symbolName: string | null;
}

export interface EdgeRef {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: string;
}

export interface IncrementalGraphDiffResult {
  addedNodes: NodeRef[];
  removedNodes: NodeRef[];
  modifiedNodes: NodeRef[];
  unchangedNodeIds: string[];
  addedEdges: EdgeRef[];
  removedEdges: EdgeRef[];
  totalPreviousNodes: number;
  totalCurrentNodes: number;
  totalPreviousEdges: number;
  totalCurrentEdges: number;
  hasNodeChanges: boolean;
  hasEdgeChanges: boolean;
}

export interface SemanticDriftEntry {
  modulePath: string;
  previousCoupling: string;
  currentCoupling: string;
  previousBoundary: string;
  currentBoundary: string;
}

export interface IncrementalSemanticDiffResult {
  changedModulePaths: string[];
  unchangedModulePaths: string[];
  couplingDrift: SemanticDriftEntry[];
  boundaryDrift: SemanticDriftEntry[];
  classificationDrift: Array<{ filePath: string; from: string; to: string }>;
  totalPreviousModules: number;
  totalCurrentModules: number;
  hasDrift: boolean;
}

export interface IncrementalCompressionDiffResult {
  reusableFileContextPaths: string[];
  invalidFileContextPaths: string[];
  reusableModuleContextPaths: string[];
  invalidModuleContextPaths: string[];
  repositoryContextChanged: boolean;
  metricsChanged: boolean;
  totalPreviousFileContexts: number;
  totalCurrentFileContexts: number;
  hasChanges: boolean;
}

export interface IncrementalDependencyImpactResult {
  impactedNodeIds: string[];
  impactedFilePaths: string[];
  impactedModulePaths: string[];
  transitiveImpactCount: number;
  directImpactCount: number;
  recomputationScope: 'none' | 'partial' | 'full';
}

export interface ReusePlanEntry {
  artifactType: 'NODE' | 'EDGE' | 'FILE_CONTEXT' | 'MODULE_CONTEXT';
  artifactId: string;
  sourceSnapshotId: string;
}

export interface ReusePlan {
  reuseNodes: ReusePlanEntry[];
  reuseEdges: ReusePlanEntry[];
  reuseFileContexts: ReusePlanEntry[];
  reuseModuleContexts: ReusePlanEntry[];
  recomputeAll: boolean;
}

export interface InvalidationEntry {
  regionType: 'NODE' | 'MODULE' | 'SEMANTIC' | 'COMPRESSION';
  regionIdentifier: string;
  invalidationReason: string;
}

export interface InvalidationResult {
  invalidations: InvalidationEntry[];
  totalInvalidated: number;
  preservedNodeCount: number;
  preservedEdgeCount: number;
}

export interface IncrementalAnalysisMetrics {
  baseSnapshotId: string | null;
  reusedNodeCount: number;
  recomputedNodeCount: number;
  reusedEdgeCount: number;
  recomputedEdgeCount: number;
  reusedFileContextCount: number;
  recomputedFileContextCount: number;
  reusedModuleContextCount: number;
  recomputedModuleContextCount: number;
  incrementalSavingsRatio: number;
  recomputationReductionRatio: number;
  traversalReductionRatio: number;
  totalPreviousNodes: number;
  totalPreviousEdges: number;
  totalCurrentNodes: number;
  totalCurrentEdges: number;
}

export interface IncrementalInput {
  projectId: string;
  baseSnapshotId: string | null;
  currentSnapshotId: string;
  currentFileHashes: Map<string, string>;
  resolutionDependencies: Array<{ sourceFile: string; targetFile: string }>;
  fileContexts: Map<string, CompressedFileContext>;
  moduleContexts: Map<string, CompressedModuleContext>;
  repositoryContext: CompressedRepositoryContext;
  metrics: CompressionMetrics;
}

export interface IncrementalOutput {
  snapshotDiff: IncrementalSnapshotDiffResult;
  graphDiff: IncrementalGraphDiffResult;
  semanticDiff: IncrementalSemanticDiffResult;
  compressionDiff: IncrementalCompressionDiffResult;
  dependencyImpact: IncrementalDependencyImpactResult;
  reusePlan: ReusePlan;
  invalidation: InvalidationResult;
  metrics: IncrementalAnalysisMetrics;
}
