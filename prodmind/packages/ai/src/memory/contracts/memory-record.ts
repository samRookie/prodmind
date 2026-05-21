export type MemoryRecordCategory = 'execution' | 'architectural' | 'semantic' | 'retrieval' | 'orchestration' | 'provenance' | 'metrics';

export interface MemoryRecord {
  readonly id: string;
  readonly category: MemoryRecordCategory;
  readonly timestamp: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly metadata: Readonly<Record<string, string>>;
  readonly provenanceId: string;
  readonly fingerprint: string;
}

export const MEMORY_RECORD_CATEGORIES: readonly MemoryRecordCategory[] = Object.freeze([
  'execution', 'architectural', 'semantic', 'retrieval', 'orchestration', 'provenance', 'metrics',
] as const);
