export interface ContextWindowEntry {
  readonly source: string;
  readonly content: string;
  readonly tokenCount: number;
  readonly priority: number;
  readonly provenanceChain: readonly string[];
}

export interface ContextWindow {
  readonly entries: readonly ContextWindowEntry[];
  readonly totalTokens: number;
  readonly budget: number;
  readonly overflow: boolean;
  readonly provenance: readonly string[];
}
