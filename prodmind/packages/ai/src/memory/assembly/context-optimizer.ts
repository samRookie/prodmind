import type { ContextWindow, ContextWindowEntry } from '../contracts/context-window.ts';
import { createContextWindow } from '../contracts/memory-factories.ts';

export interface OptimizerOptions {
  readonly maxTokens: number;
  readonly maxEntries?: number;
  readonly deduplicate?: boolean;
  readonly priorityThreshold?: number;
}

const DEFAULT_OPTIONS: OptimizerOptions = Object.freeze({
  maxTokens: 4096,
  deduplicate: true,
});

export class ContextOptimizer {
  optimize(window: ContextWindow, options?: Partial<OptimizerOptions>): ContextWindow {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let entries = [...window.entries];

    if (opts.deduplicate) {
      entries = this._deduplicate(entries);
    }

    if (opts.priorityThreshold !== undefined) {
      entries = entries.filter(e => e.priority >= (opts.priorityThreshold ?? 0));
    }

    entries.sort((a, b) => b.priority - a.priority);

    if (opts.maxEntries !== undefined && entries.length > opts.maxEntries) {
      entries = entries.slice(0, opts.maxEntries);
    }

    let totalTokens = entries.reduce((sum, e) => sum + e.tokenCount, 0);
    if (totalTokens > opts.maxTokens) {
      entries = this._trimToBudget(entries, opts.maxTokens);
      totalTokens = entries.reduce((sum, e) => sum + e.tokenCount, 0);
    }

    return createContextWindow({
      entries: Object.freeze(entries),
      totalTokens,
      budget: opts.maxTokens,
      overflow: totalTokens > opts.maxTokens,
      provenance: [...window.provenance],
    });
  }

  compress(window: ContextWindow, compressionRatio: number): ContextWindow {
    const ratio = Math.max(0.1, Math.min(1, compressionRatio));
    const targetTokens = Math.floor(window.totalTokens * ratio);
    return this.optimize(window, { maxTokens: targetTokens });
  }

  private _deduplicate(entries: ContextWindowEntry[]): ContextWindowEntry[] {
    const seen = new Set<string>();
    return entries.filter(e => {
      const key = `${e.source}|${e.content}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private _trimToBudget(entries: ContextWindowEntry[], budget: number): ContextWindowEntry[] {
    const sorted = [...entries].sort((a, b) => b.priority - a.priority);
    const kept: ContextWindowEntry[] = [];
    let running = 0;

    for (const entry of sorted) {
      if (running + entry.tokenCount <= budget) {
        kept.push(entry);
        running += entry.tokenCount;
      }
    }

    return kept.sort((a, b) => b.priority - a.priority);
  }
}
