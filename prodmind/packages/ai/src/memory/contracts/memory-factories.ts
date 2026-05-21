import type { ContextWindow, ContextWindowEntry } from './context-window.ts';
import type { MemoryRecord, MemoryRecordCategory } from './memory-record.ts';
import type { MemorySnapshot, SerializedMemorySnapshot } from './memory-snapshot.ts';
import type { ProvenanceRecord, ProvenanceSourceType } from './provenance-record.ts';
import type { RetrievalQuery, RetrievalStrategy } from './retrieval-query.ts';
import type { EdgeRelationship, SemanticEdge } from './semantic-edge.ts';
import type { SemanticNode, SemanticNodeType } from './semantic-node.ts';

let idCounter = 0;

export function generateMemoryId(prefix = 'mem'): string {
  idCounter++;
  return `${prefix}_${idCounter}`;
}

export function createMemoryRecord(input: {
  id?: string;
  category: MemoryRecordCategory;
  timestamp?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, string>;
  provenanceId?: string;
  fingerprint?: string;
}): MemoryRecord {
  return Object.freeze({
    id: input.id ?? generateMemoryId('mem'),
    category: input.category,
    timestamp: input.timestamp ?? '',
    payload: Object.freeze({ ...input.payload }),
    metadata: Object.freeze({ ...input.metadata }),
    provenanceId: input.provenanceId ?? '',
    fingerprint: input.fingerprint ?? '',
  });
}

export function createSemanticNode(input: {
  id?: string;
  type: SemanticNodeType;
  label: string;
  tags?: readonly string[];
  properties?: Record<string, unknown>;
  fingerprints?: readonly string[];
}): SemanticNode {
  return Object.freeze({
    id: input.id ?? generateMemoryId('node'),
    type: input.type,
    label: input.label,
    tags: Object.freeze([...(input.tags ?? [])]),
    properties: Object.freeze({ ...input.properties }),
    fingerprints: Object.freeze([...(input.fingerprints ?? [])]),
  });
}

export function createSemanticEdge(input: {
  sourceId: string;
  targetId: string;
  relationship: EdgeRelationship;
  weight?: number;
  provenanceRef?: string;
}): SemanticEdge {
  return Object.freeze({
    sourceId: input.sourceId,
    targetId: input.targetId,
    relationship: input.relationship,
    weight: input.weight ?? 1,
    provenanceRef: input.provenanceRef ?? '',
  });
}

export function createContextWindowEntry(input: {
  source: string;
  content: string;
  tokenCount?: number;
  priority?: number;
  provenanceChain?: readonly string[];
}): ContextWindowEntry {
  return Object.freeze({
    source: input.source,
    content: input.content,
    tokenCount: input.tokenCount ?? 0,
    priority: input.priority ?? 0,
    provenanceChain: Object.freeze([...(input.provenanceChain ?? [])]),
  });
}

export function createContextWindow(input: {
  entries?: readonly ContextWindowEntry[];
  totalTokens?: number;
  budget?: number;
  overflow?: boolean;
  provenance?: readonly string[];
}): ContextWindow {
  return Object.freeze({
    entries: Object.freeze([...(input.entries ?? [])]),
    totalTokens: input.totalTokens ?? 0,
    budget: input.budget ?? 0,
    overflow: input.overflow ?? false,
    provenance: Object.freeze([...(input.provenance ?? [])]),
  });
}

export function createRetrievalQuery(input: {
  seedIds: readonly string[];
  maxDepth?: number;
  maxResults?: number;
  namespace?: string;
  strategy?: RetrievalStrategy;
  filterCategories?: readonly MemoryRecordCategory[];
  queryTerms?: readonly string[];
}): RetrievalQuery {
  return Object.freeze({
    seedIds: Object.freeze([...input.seedIds]),
    maxDepth: input.maxDepth ?? 5,
    maxResults: input.maxResults ?? 50,
    namespace: input.namespace,
    strategy: input.strategy ?? 'hybrid',
    filterCategories: input.filterCategories ? Object.freeze([...input.filterCategories]) : undefined,
    queryTerms: input.queryTerms ? Object.freeze([...input.queryTerms]) : undefined,
  });
}

export function createProvenanceRecord(input: {
  id?: string;
  sourceId: string;
  sourceType: ProvenanceSourceType;
  orchestrationId?: string;
  executionId?: string;
  timestamp?: string;
  fingerprint?: string;
  parentId?: string;
}): ProvenanceRecord {
  return Object.freeze({
    id: input.id ?? generateMemoryId('prov'),
    sourceId: input.sourceId,
    sourceType: input.sourceType,
    orchestrationId: input.orchestrationId ?? '',
    executionId: input.executionId ?? '',
    timestamp: input.timestamp ?? '',
    fingerprint: input.fingerprint ?? '',
    parentId: input.parentId ?? '',
  });
}

export function createMemorySnapshot(input: {
  version?: string;
  fingerprint?: string;
  createdAt?: string;
  records?: readonly MemoryRecord[];
  nodes?: readonly SemanticNode[];
  edges?: readonly SemanticEdge[];
  provenances?: readonly ProvenanceRecord[];
}): MemorySnapshot {
  return Object.freeze({
    version: input.version ?? '1.0',
    fingerprint: input.fingerprint ?? '',
    createdAt: input.createdAt ?? '',
    records: Object.freeze([...(input.records ?? [])]),
    nodes: Object.freeze([...(input.nodes ?? [])]),
    edges: Object.freeze([...(input.edges ?? [])]),
    provenances: Object.freeze([...(input.provenances ?? [])]),
  });
}

export function createSerializedMemorySnapshot(input: {
  version?: string;
  fingerprint?: string;
  createdAt?: string;
  payload: string;
}): SerializedMemorySnapshot {
  return Object.freeze({
    version: input.version ?? '1.0',
    fingerprint: input.fingerprint ?? '',
    createdAt: input.createdAt ?? '',
    payload: input.payload,
  });
}
