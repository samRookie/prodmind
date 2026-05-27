import type { MemoryEntry } from '../contracts/memory-contracts.ts';

export interface CategoryBudget {
  readonly category: string;
  readonly allocatedTokens: number;
  readonly usedTokens: number;
}

export class ContextBudget {
  private readonly _allocations: Map<string, number> = new Map();
  private _globalBudget: number;
  private _usedTokens = 0;

  constructor(globalBudget = 8192) {
    this._globalBudget = globalBudget;
  }

  get globalBudget(): number {
    return this._globalBudget;
  }

  get usedTokens(): number {
    return this._usedTokens;
  }

  get remainingTokens(): number {
    return this._globalBudget - this._usedTokens;
  }

  setGlobalBudget(budget: number): void {
    this._globalBudget = Math.max(1, budget);
  }

  allocate(category: string, tokens: number): void {
    this._allocations.set(category, tokens);
  }

  getAllocation(category: string): CategoryBudget | undefined {
    const allocated = this._allocations.get(category);
    if (allocated === undefined) return undefined;
    return Object.freeze({
      category,
      allocatedTokens: allocated,
      usedTokens: this._getCategoryUsage(category),
    });
  }

  consume(category: string, tokens: number): boolean {
    const allocated = this._allocations.get(category);
    if (allocated === undefined) return false;
    const catUsed = this._getCategoryUsage(category);
    if (catUsed + tokens > allocated) return false;
    if (this._usedTokens + tokens > this._globalBudget) return false;

    this._usedTokens += tokens;
    const usageKey = `_usage_${category}`;
    const current = (this as Record<string, unknown>)[usageKey] as number ?? 0;
    (this as Record<string, unknown>)[usageKey] = current + tokens;
    return true;
  }

  fitsWithinBudget(entry: MemoryEntry): boolean {
    const estimatedTokens = this.estimateTokens(entry);
    return estimatedTokens <= this.remainingTokens;
  }

  allocateBudget(entries: readonly MemoryEntry[]): readonly MemoryEntry[] {
    const result: MemoryEntry[] = [];
    const byCategory = new Map<string, MemoryEntry[]>();
    for (const entry of entries) {
      const existing = byCategory.get(entry.category) ?? [];
      existing.push(entry);
      byCategory.set(entry.category, existing);
    }

    for (const [category, catEntries] of byCategory) {
      const allocated = this._allocations.get(category) ?? this._globalBudget;
      let catRemaining = allocated;
      const sorted = [...catEntries].sort((a, b) => b.timestamp.localeCompare(a.timestamp) || a.id.localeCompare(b.id));

      for (const entry of sorted) {
        if (this._usedTokens >= this._globalBudget || catRemaining <= 0) break;
        const estimated = this.estimateTokens(entry);
        if (estimated <= catRemaining && estimated <= this.remainingTokens) {
          result.push(entry);
          this._usedTokens += estimated;
          catRemaining -= estimated;
          const usageKey = `_usage_${category}`;
          (this as Record<string, unknown>)[usageKey] = ((this as Record<string, unknown>)[usageKey] as number ?? 0) + estimated;
        }
      }
    }

    return Object.freeze(result.sort((a, b) => a.id.localeCompare(b.id)));
  }

  estimateTokens(entry: MemoryEntry): number {
    return Math.ceil((entry.content.length + JSON.stringify(entry.metadata).length + entry.tags.join(',').length) / 4);
  }

  getAllocations(): readonly CategoryBudget[] {
    return Object.freeze(
      [...this._allocations.entries()].map(([category, allocatedTokens]) => ({
        category,
        allocatedTokens,
        usedTokens: this._getCategoryUsage(category),
      })).sort((a, b) => a.category.localeCompare(b.category)),
    );
  }

  reset(): void {
    this._usedTokens = 0;
  }

  clear(): void {
    this._allocations.clear();
    this._usedTokens = 0;
  }

  private _getCategoryUsage(category: string): number {
    const usageKey = `_usage_${category}`;
    return (this as Record<string, unknown>)[usageKey] as number ?? 0;
  }
}
