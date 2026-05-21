import type { ContextWindow, ContextWindowEntry } from '../contracts/context-window.ts';
import { createContextWindow } from '../contracts/memory-factories.ts';

export interface WindowTrimOptions {
  readonly maxTokens: number;
  readonly maxEntries?: number;
}

export class ContextWindowManager {
  trim(window: ContextWindow, options: WindowTrimOptions): ContextWindow {
    let entries: readonly ContextWindowEntry[] = window.entries;

    if (options.maxEntries !== undefined && entries.length > options.maxEntries) {
      entries = entries
        .slice()
        .sort((a, b) => b.priority - a.priority)
        .slice(0, options.maxEntries);
    }

    let totalTokens = entries.reduce((sum, e) => sum + e.tokenCount, 0);

    if (totalTokens > options.maxTokens) {
      const sorted = [...entries].sort((a, b) => b.priority - a.priority);
      const trimmed: ContextWindowEntry[] = [];
      let running = 0;

      for (const entry of sorted) {
        if (running + entry.tokenCount <= options.maxTokens) {
          trimmed.push(entry);
          running += entry.tokenCount;
        }
      }

      entries = Object.freeze(
        trimmed.sort((a, b) => b.priority - a.priority),
      );
      totalTokens = running;
    }

    return createContextWindow({
      entries,
      totalTokens,
      budget: window.budget,
      overflow: totalTokens > window.budget,
      provenance: [...window.provenance],
    });
  }

  mergeWindows(windows: readonly ContextWindow[]): ContextWindow {
    const entries = windows.flatMap(w => w.entries);
    const totalTokens = entries.reduce((sum, e) => sum + e.tokenCount, 0);
    const budget = Math.max(...windows.map(w => w.budget));

    return createContextWindow({
      entries: Object.freeze(
        [...entries].sort((a, b) => b.priority - a.priority),
      ),
      totalTokens,
      budget,
      overflow: totalTokens > budget,
    });
  }

  filterBySource(window: ContextWindow, source: string): ContextWindow {
    const entries = window.entries.filter(e => e.source === source);
    const totalTokens = entries.reduce((sum, e) => sum + e.tokenCount, 0);

    return createContextWindow({
      entries,
      totalTokens,
      budget: window.budget,
      overflow: totalTokens > window.budget,
    });
  }
}
