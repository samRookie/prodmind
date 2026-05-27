import type { ContextWindow, ContextWindowEntry } from '../contracts/context-window.ts';
import { createContextWindow } from '../contracts/memory-factories.ts';

export interface CategoryAllocation {
  readonly category: string;
  readonly maxTokens: number;
  readonly usedTokens: number;
}

export class ContextBudgeter {
  private readonly _allocations: Map<string, number> = new Map();
  private readonly _usage: Map<string, number> = new Map();
  private _globalBudget: number;

  constructor(globalBudget = 4096) {
    this._globalBudget = globalBudget;
  }

  get globalBudget(): number {
    return this._globalBudget;
  }

  setGlobalBudget(budget: number): void {
    this._globalBudget = Math.max(1, budget);
  }

  allocate(category: string, maxTokens: number): void {
    this._allocations.set(category, maxTokens);
    if (!this._usage.has(category)) {
      this._usage.set(category, 0);
    }
  }

  deallocate(category: string): void {
    this._allocations.delete(category);
    this._usage.delete(category);
  }

  getAllocation(category: string): CategoryAllocation | undefined {
    const maxTokens = this._allocations.get(category);
    if (maxTokens === undefined) return undefined;
    return Object.freeze({
      category,
      maxTokens,
      usedTokens: this._usage.get(category) ?? 0,
    });
  }

  get allocations(): readonly CategoryAllocation[] {
    return Object.freeze(
      [...this._allocations.entries()]
        .map(([category, maxTokens]) => ({
          category,
          maxTokens,
          usedTokens: this._usage.get(category) ?? 0,
        }))
        .sort((a, b) => a.category.localeCompare(b.category)),
    );
  }

  budgetWindow(window: ContextWindow): ContextWindow {
    const entries = this._applyBudget(window.entries);
    const totalTokens = entries.reduce((sum, e) => sum + e.tokenCount, 0);
    return createContextWindow({
      entries,
      totalTokens,
      budget: this._globalBudget,
      overflow: totalTokens > this._globalBudget,
    });
  }

  private _applyBudget(entries: readonly ContextWindowEntry[]): readonly ContextWindowEntry[] {
    let globalRemaining = this._globalBudget;
    const result: ContextWindowEntry[] = [];
    const byCategory = new Map<string, ContextWindowEntry[]>();

    for (const entry of entries) {
      const cat = entry.source;
      const existing = byCategory.get(cat) ?? [];
      existing.push(entry);
      byCategory.set(cat, existing);
    }

    for (const [category, catEntries] of byCategory) {
      const catBudget = this._allocations.get(category) ?? this._globalBudget;
      let catRemaining = catBudget;
      const sorted = [...catEntries].sort((a, b) => b.priority - a.priority);

      for (const entry of sorted) {
        if (globalRemaining <= 0 || catRemaining <= 0) break;
        if (entry.tokenCount <= globalRemaining && entry.tokenCount <= catRemaining) {
          result.push(entry);
          globalRemaining -= entry.tokenCount;
          catRemaining -= entry.tokenCount;
          this._usage.set(category, (this._usage.get(category) ?? 0) + entry.tokenCount);
        }
      }
    }

    return Object.freeze(
      result.sort((a, b) => b.priority - a.priority),
    );
  }

  reset(): void {
    this._usage.clear();
  }

  resetCategory(category: string): void {
    this._usage.set(category, 0);
  }

  clear(): void {
    this._allocations.clear();
    this._usage.clear();
  }
}
