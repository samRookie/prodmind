export type RetrievalStrategy = 'exact' | 'namespace' | 'dependency' | 'provenance' | 'hybrid';

export interface RetrievalQuery {
  readonly seedIds: readonly string[];
  readonly maxDepth: number;
  readonly maxResults: number;
  readonly namespace?: string;
  readonly strategy: RetrievalStrategy;
  readonly filterCategories?: readonly MemoryRecordCategory[];
  readonly queryTerms?: readonly string[];
}

export const RETRIEVAL_STRATEGIES: readonly RetrievalStrategy[] = Object.freeze([
  'exact', 'namespace', 'dependency', 'provenance', 'hybrid',
] as const);

import type { MemoryRecordCategory } from './memory-record.ts';
