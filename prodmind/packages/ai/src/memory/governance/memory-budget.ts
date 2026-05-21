export interface BudgetAllocation {
  readonly category: string;
  readonly maxTokens: number;
  readonly maxRecords: number;
  readonly currentTokens: number;
  readonly currentRecords: number;
}

export class MemoryBudget {
  private readonly _allocations: Map<string, { maxTokens: number; maxRecords: number }> = new Map();
  private readonly _usage: Map<string, { tokens: number; records: number }> = new Map();

  allocate(category: string, maxTokens: number, maxRecords: number): void {
    this._allocations.set(category, { maxTokens, maxRecords });
    if (!this._usage.has(category)) {
      this._usage.set(category, { tokens: 0, records: 0 });
    }
  }

  deallocate(category: string): void {
    this._allocations.delete(category);
    this._usage.delete(category);
  }

  track(category: string, tokens: number, records: number): void {
    const usage = this._usage.get(category);
    if (usage) {
      usage.tokens += tokens;
      usage.records += records;
    }
  }

  isWithinBudget(category: string, additionalTokens = 0, additionalRecords = 0): boolean {
    const alloc = this._allocations.get(category);
    if (!alloc) return false;
    const usage = this._usage.get(category);
    if (!usage) return true;
    return (
      usage.tokens + additionalTokens <= alloc.maxTokens &&
      usage.records + additionalRecords <= alloc.maxRecords
    );
  }

  getAllocation(category: string): BudgetAllocation | undefined {
    const alloc = this._allocations.get(category);
    const usage = this._usage.get(category);
    if (!alloc || !usage) return undefined;
    return Object.freeze({
      category,
      maxTokens: alloc.maxTokens,
      maxRecords: alloc.maxRecords,
      currentTokens: usage.tokens,
      currentRecords: usage.records,
    });
  }

  get allocations(): readonly BudgetAllocation[] {
    const result: BudgetAllocation[] = [];
    for (const [category, alloc] of this._allocations) {
      const usage = this._usage.get(category)!;
      result.push({
        category,
        maxTokens: alloc.maxTokens,
        maxRecords: alloc.maxRecords,
        currentTokens: usage.tokens,
        currentRecords: usage.records,
      });
    }
    return Object.freeze(result.sort((a, b) => a.category.localeCompare(b.category)));
  }

  reset(category: string): void {
    this._usage.set(category, { tokens: 0, records: 0 });
  }

  clear(): void {
    this._allocations.clear();
    this._usage.clear();
  }
}
