import type { MemoryEntry, ArchitecturalFinding } from '../contracts/memory-contracts.ts';

export interface RetrievalBudgetConfig {
  readonly maxEntries: number;
  readonly maxFindings: number;
  readonly maxTokens: number;
  readonly maxDepth: number;
}

export class RetrievalBudget {
  private _config: RetrievalBudgetConfig;

  constructor(config?: Partial<RetrievalBudgetConfig>) {
    this._config = {
      maxEntries: 100,
      maxFindings: 50,
      maxTokens: 8192,
      maxDepth: 5,
      ...config,
    };
  }

  get config(): RetrievalBudgetConfig {
    return Object.freeze({ ...this._config });
  }

  update(config: Partial<RetrievalBudgetConfig>): void {
    this._config = { ...this._config, ...config };
  }

  canAddEntry(currentCount: number, estimatedTokens: number): boolean {
    return currentCount < this._config.maxEntries && estimatedTokens <= this._config.maxTokens;
  }

  canAddFinding(currentCount: number): boolean {
    return currentCount < this._config.maxFindings;
  }

  withinDepth(currentDepth: number): boolean {
    return currentDepth <= this._config.maxDepth;
  }

  trimEntries(entries: readonly MemoryEntry[]): readonly MemoryEntry[] {
    if (entries.length <= this._config.maxEntries) return entries;
    return Object.freeze(entries.slice(0, this._config.maxEntries));
  }

  trimFindings(findings: readonly ArchitecturalFinding[]): readonly ArchitecturalFinding[] {
    if (findings.length <= this._config.maxFindings) return findings;
    return Object.freeze(findings.slice(0, this._config.maxFindings));
  }

  estimateTokens(entry: MemoryEntry): number {
    return Math.ceil((entry.content.length + JSON.stringify(entry.metadata).length) / 4);
  }

  reset(): void {
    this._config = {
      maxEntries: 100,
      maxFindings: 50,
      maxTokens: 8192,
      maxDepth: 5,
    };
  }
}
