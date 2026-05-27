export interface BudgetAllocation {
  readonly category: string;
  readonly maxTokens: number;
  readonly maxExecutions: number;
  readonly usedTokens: number;
  readonly usedExecutions: number;
}

export class ExecutionBudget {
  private readonly _allocations: Map<string, { maxTokens: number; maxExecutions: number }> = new Map();
  private readonly _usage: Map<string, { tokens: number; executions: number }> = new Map();
  private _globalMaxTokens: number;
  private _globalUsedTokens = 0;

  constructor(globalMaxTokens = 10000) {
    this._globalMaxTokens = globalMaxTokens;
  }

  get globalMaxTokens(): number { return this._globalMaxTokens; }

  allocate(category: string, maxTokens: number, maxExecutions: number): void {
    this._allocations.set(category, { maxTokens, maxExecutions });
    if (!this._usage.has(category)) {
      this._usage.set(category, { tokens: 0, executions: 0 });
    }
  }

  consume(category: string, tokens: number): boolean {
    const alloc = this._allocations.get(category);
    if (!alloc) return false;
    const usage = this._usage.get(category)!;

    if (usage.tokens + tokens > alloc.maxTokens) return false;
    if (usage.executions + 1 > alloc.maxExecutions) return false;
    if (this._globalUsedTokens + tokens > this._globalMaxTokens) return false;

    usage.tokens += tokens;
    usage.executions += 1;
    this._globalUsedTokens += tokens;
    return true;
  }

  isWithinBudget(category: string, additionalTokens = 0): boolean {
    const alloc = this._allocations.get(category);
    if (!alloc) return false;
    const usage = this._usage.get(category)!;
    return (
      usage.tokens + additionalTokens <= alloc.maxTokens &&
      usage.executions + 1 <= alloc.maxExecutions &&
      this._globalUsedTokens + additionalTokens <= this._globalMaxTokens
    );
  }

  getAllocation(category: string): BudgetAllocation | undefined {
    const alloc = this._allocations.get(category);
    const usage = this._usage.get(category);
    if (!alloc || !usage) return undefined;
    return Object.freeze({
      category,
      maxTokens: alloc.maxTokens,
      maxExecutions: alloc.maxExecutions,
      usedTokens: usage.tokens,
      usedExecutions: usage.executions,
    });
  }

  getAllocations(): readonly BudgetAllocation[] {
    return Object.freeze(
      [...this._allocations.keys()].map(c => this.getAllocation(c)!).sort((a, b) => a.category.localeCompare(b.category)),
    );
  }

  reset(): void {
    this._usage.clear();
    this._globalUsedTokens = 0;
  }

  resetCategory(category: string): void {
    this._usage.set(category, { tokens: 0, executions: 0 });
  }

  clear(): void {
    this._allocations.clear();
    this._usage.clear();
    this._globalUsedTokens = 0;
  }
}
