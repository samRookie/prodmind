export type ProvenanceSourceType = 'orchestration' | 'provider' | 'graph' | 'replay' | 'manual';

export interface ProvenanceRecord {
  readonly id: string;
  readonly sourceId: string;
  readonly sourceType: ProvenanceSourceType;
  readonly orchestrationId: string;
  readonly executionId: string;
  readonly timestamp: string;
  readonly fingerprint: string;
  readonly parentId: string;
}

export const PROVENANCE_SOURCE_TYPES: readonly ProvenanceSourceType[] = Object.freeze([
  'orchestration', 'provider', 'graph', 'replay', 'manual',
] as const);
