import type { RetrievalStrategy, SemanticType } from '@prodmind/contracts';
import { generateId, now } from '@prodmind/db';

export type ContextSliceKind =
  | 'local_neighborhood'
  | 'upstream_chain'
  | 'downstream_chain'
  | 'semantic_region'
  | 'architectural_boundary'
  | 'coupled_subsystem'
  | 'unstable_region'
  | 'risk_oriented';

export type CompressionPreference = 'prefer_raw' | 'prefer_compressed' | 'hybrid' | 'adaptive';

export type AssemblyOperation =
  | 'retrieve'
  | 'rank'
  | 'slice'
  | 'budget'
  | 'compress'
  | 'dedup'
  | 'normalize'
  | 'replay';

export interface ContextAssemblyRequest {
  readonly snapshotId: string;
  readonly seedNodeIds?: readonly string[];
  readonly seedSymbolNames?: readonly string[];
  readonly strategies?: readonly RetrievalStrategy[];
  readonly sliceKinds?: readonly ContextSliceKind[];
  readonly maxBudget?: number;
  readonly compressionPreference?: CompressionPreference;
  readonly semanticTypes?: readonly SemanticType[];
  readonly clusterNames?: readonly string[];
  readonly traceId?: string;
}

export interface ContextNode {
  readonly nodeId: string;
  readonly filePath: string;
  readonly depth: number;
  readonly nodeType: string;
  readonly language: string | null;
  readonly symbolName: string | null;
  readonly centralityScore: number | null;
  readonly instabilityScore: number | null;
  readonly propagationRiskScore: number | null;
  readonly fanIn: number | null;
  readonly fanOut: number | null;
  readonly semanticType: string | null;
}

export interface ContextDependencyEdge {
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly edgeType: string;
  readonly weight: number | null;
}

export interface ContextRegion {
  readonly regionName: string;
  readonly nodeIds: readonly string[];
  readonly semanticType: string | null;
  readonly clusterName: string | null;
  readonly nodeCount: number;
}

export interface ContextDependencyChain {
  readonly chainId: string;
  readonly direction: 'upstream' | 'downstream' | 'sibling';
  readonly nodes: readonly ContextNode[];
  readonly edges: readonly ContextDependencyEdge[];
  readonly totalRisk: number;
  readonly maxDepth: number;
}

export interface ContextSlice {
  readonly id: string;
  readonly kind: ContextSliceKind;
  readonly strategy: string;
  readonly nodes: readonly ContextNode[];
  readonly edges: readonly ContextDependencyEdge[];
  readonly regions: readonly ContextRegion[];
  readonly chains: readonly ContextDependencyChain[];
  readonly tokenCount: number;
  readonly compressionEnvelope?: ContextCompressionEnvelope;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ContextCompressionEnvelope {
  readonly kind: 'raw' | 'compressed' | 'hybrid';
  readonly originalTokenCount: number;
  readonly compressedTokenCount: number;
  readonly ratio: number;
  readonly contextType: string;
  readonly sourcePath: string;
}

export interface ContextBudget {
  readonly total: number;
  readonly used: number;
  readonly remaining: number;
  readonly reserved: number;
  readonly hardLimit: number;
  readonly softLimit: number;
  readonly isOverHard: boolean;
  readonly isOverSoft: boolean;
}

export interface RetrievalCandidate {
  readonly node: ContextNode;
  readonly compositeScore: number;
  readonly centralityScore: number;
  readonly proximityScore: number;
  readonly semanticScore: number;
  readonly riskScore: number;
  readonly source: string;
  readonly reason: string;
}

export interface RankedContextResult {
  readonly candidates: readonly RetrievalCandidate[];
  readonly strategy: string;
  readonly weightsUsed: Readonly<Record<string, number>>;
  readonly totalCandidates: number;
  readonly discardedCount: number;
}

export interface AssemblyTraceEntry {
  readonly operation: AssemblyOperation;
  readonly timestamp: string;
  readonly details: Readonly<Record<string, unknown>>;
  readonly durationMs: number;
  readonly resultCount?: number;
  readonly discardedCount?: number;
}

export interface AssemblyTrace {
  readonly entries: readonly AssemblyTraceEntry[];
  readonly totalDurationMs: number;
  readonly operationCount: number;
}

export interface AssemblyMetrics {
  readonly totalRetrieved: number;
  readonly totalRanked: number;
  readonly totalSliced: number;
  readonly totalCompressed: number;
  readonly totalDeduped: number;
  readonly totalDiscarded: number;
  readonly finalTokenCount: number;
  readonly budgetUtilization: number;
  readonly assemblyDurationMs: number;
}

export interface ContextAssemblyResult {
  readonly request: ContextAssemblyRequest;
  readonly slices: readonly ContextSlice[];
  readonly budget: ContextBudget;
  readonly trace: AssemblyTrace;
  readonly metrics: AssemblyMetrics;
  readonly fingerprint: string;
  readonly generatedAt: string;
}

export interface ContextReplayEnvelope {
  readonly originalFingerprint: string;
  readonly replayedFingerprint: string;
  readonly match: boolean;
  readonly divergence: readonly string[];
  readonly originalResult: ContextAssemblyResult;
  readonly replayedResult: ContextAssemblyResult;
}

export function createContextNode(input: ContextNode): ContextNode {
  return Object.freeze({
    nodeId: input.nodeId,
    filePath: input.filePath,
    depth: input.depth,
    nodeType: input.nodeType,
    language: input.language,
    symbolName: input.symbolName,
    centralityScore: input.centralityScore,
    instabilityScore: input.instabilityScore,
    propagationRiskScore: input.propagationRiskScore,
    fanIn: input.fanIn,
    fanOut: input.fanOut,
    semanticType: input.semanticType,
  });
}

export function createContextDependencyEdge(input: ContextDependencyEdge): ContextDependencyEdge {
  return Object.freeze({
    sourceNodeId: input.sourceNodeId,
    targetNodeId: input.targetNodeId,
    edgeType: input.edgeType,
    weight: input.weight,
  });
}

export function createContextRegion(input: {
  regionName: string;
  nodeIds: string[];
  semanticType: string | null;
  clusterName: string | null;
}): ContextRegion {
  return Object.freeze({
    regionName: input.regionName,
    nodeIds: Object.freeze([...input.nodeIds].sort()),
    semanticType: input.semanticType,
    clusterName: input.clusterName,
    nodeCount: input.nodeIds.length,
  });
}

export function createContextDependencyChain(input: {
  direction: 'upstream' | 'downstream' | 'sibling';
  nodes: ContextNode[];
  edges: ContextDependencyEdge[];
  totalRisk: number;
  maxDepth: number;
}): ContextDependencyChain {
  return Object.freeze({
    chainId: generateId(),
    direction: input.direction,
    nodes: Object.freeze([...input.nodes]),
    edges: Object.freeze([...input.edges]),
    totalRisk: input.totalRisk,
    maxDepth: input.maxDepth,
  });
}

export function createContextSlice(input: {
  kind: ContextSliceKind;
  strategy: string;
  nodes: ContextNode[];
  edges: ContextDependencyEdge[];
  regions: ContextRegion[];
  chains: ContextDependencyChain[];
  tokenCount: number;
  compressionEnvelope?: ContextCompressionEnvelope;
  metadata?: Record<string, unknown>;
}): ContextSlice {
  return Object.freeze({
    id: generateId(),
    kind: input.kind,
    strategy: input.strategy,
    nodes: Object.freeze([...input.nodes]),
    edges: Object.freeze([...input.edges]),
    regions: Object.freeze([...input.regions]),
    chains: Object.freeze([...input.chains]),
    tokenCount: input.tokenCount,
    compressionEnvelope: input.compressionEnvelope,
    metadata: Object.freeze({ ...input.metadata }),
  });
}

export function createContextCompressionEnvelope(input: {
  kind: 'raw' | 'compressed' | 'hybrid';
  originalTokenCount: number;
  compressedTokenCount: number;
  contextType: string;
  sourcePath: string;
}): ContextCompressionEnvelope {
  return Object.freeze({
    kind: input.kind,
    originalTokenCount: input.originalTokenCount,
    compressedTokenCount: input.compressedTokenCount,
    ratio: input.originalTokenCount > 0
      ? input.compressedTokenCount / input.originalTokenCount
      : 1,
    contextType: input.contextType,
    sourcePath: input.sourcePath,
  });
}

export function createContextBudget(input: {
  total: number;
  used: number;
  reserved: number;
  hardLimit: number;
  softLimit: number;
}): ContextBudget {
  return Object.freeze({
    total: input.total,
    used: input.used,
    remaining: input.total - input.used,
    reserved: input.reserved,
    hardLimit: input.hardLimit,
    softLimit: input.softLimit,
    isOverHard: input.used > input.hardLimit,
    isOverSoft: input.used > input.softLimit,
  });
}

export function createRetrievalCandidate(input: {
  node: ContextNode;
  compositeScore: number;
  centralityScore: number;
  proximityScore: number;
  semanticScore: number;
  riskScore: number;
  source: string;
  reason: string;
}): RetrievalCandidate {
  return Object.freeze({
    node: input.node,
    compositeScore: input.compositeScore,
    centralityScore: input.centralityScore,
    proximityScore: input.proximityScore,
    semanticScore: input.semanticScore,
    riskScore: input.riskScore,
    source: input.source,
    reason: input.reason,
  });
}

export function createRankedContextResult(input: {
  candidates: RetrievalCandidate[];
  strategy: string;
  weightsUsed: Record<string, number>;
  discardedCount: number;
}): RankedContextResult {
  return Object.freeze({
    candidates: Object.freeze([...input.candidates]),
    strategy: input.strategy,
    weightsUsed: Object.freeze({ ...input.weightsUsed }),
    totalCandidates: input.candidates.length,
    discardedCount: input.discardedCount,
  });
}

export function createAssemblyTraceEntry(input: {
  operation: AssemblyOperation;
  details: Record<string, unknown>;
  durationMs: number;
  resultCount?: number;
  discardedCount?: number;
}): AssemblyTraceEntry {
  return Object.freeze({
    operation: input.operation,
    timestamp: now(),
    details: Object.freeze({ ...input.details }),
    durationMs: input.durationMs,
    resultCount: input.resultCount,
    discardedCount: input.discardedCount,
  });
}

export function createAssemblyTrace(entries: AssemblyTraceEntry[]): AssemblyTrace {
  const sorted = [...entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const totalDurationMs = sorted.reduce((sum, e) => sum + e.durationMs, 0);
  return Object.freeze({
    entries: Object.freeze(sorted),
    totalDurationMs,
    operationCount: sorted.length,
  });
}

export function createAssemblyMetrics(input: {
  totalRetrieved: number;
  totalRanked: number;
  totalSliced: number;
  totalCompressed: number;
  totalDeduped: number;
  totalDiscarded: number;
  finalTokenCount: number;
  budgetUtilization: number;
  assemblyDurationMs: number;
}): AssemblyMetrics {
  return Object.freeze({ ...input });
}

export function createContextAssemblyResult(input: {
  request: ContextAssemblyRequest;
  slices: ContextSlice[];
  budget: ContextBudget;
  trace: AssemblyTrace;
  metrics: AssemblyMetrics;
  fingerprint: string;
}): ContextAssemblyResult {
  return Object.freeze({
    request: input.request,
    slices: Object.freeze([...input.slices]),
    budget: input.budget,
    trace: input.trace,
    metrics: input.metrics,
    fingerprint: input.fingerprint,
    generatedAt: now(),
  });
}

export function createContextReplayEnvelope(input: {
  originalFingerprint: string;
  replayedFingerprint: string;
  match: boolean;
  divergence: string[];
  originalResult: ContextAssemblyResult;
  replayedResult: ContextAssemblyResult;
}): ContextReplayEnvelope {
  return Object.freeze({
    originalFingerprint: input.originalFingerprint,
    replayedFingerprint: input.replayedFingerprint,
    match: input.match,
    divergence: Object.freeze([...input.divergence]),
    originalResult: input.originalResult,
    replayedResult: input.replayedResult,
  });
}
