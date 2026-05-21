import type { MemoryRecord } from './memory-record.ts';
import type { ProvenanceRecord } from './provenance-record.ts';
import type { SemanticEdge } from './semantic-edge.ts';
import type { SemanticNode } from './semantic-node.ts';

export interface MemorySnapshot {
  readonly version: string;
  readonly fingerprint: string;
  readonly createdAt: string;
  readonly records: readonly MemoryRecord[];
  readonly nodes: readonly SemanticNode[];
  readonly edges: readonly SemanticEdge[];
  readonly provenances: readonly ProvenanceRecord[];
}

export interface SerializedMemorySnapshot {
  readonly version: string;
  readonly fingerprint: string;
  readonly createdAt: string;
  readonly payload: string;
}
