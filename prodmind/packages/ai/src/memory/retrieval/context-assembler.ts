import type { ContextWindow, ContextWindowEntry } from '../contracts/context-window.ts';
import { createContextWindow, createContextWindowEntry } from '../contracts/memory-factories.ts';
import type { QueryResult } from '../graph/graph-query.ts';

export interface AssemblyOptions {
  readonly budget: number;
  readonly maxEntries?: number;
  readonly priorityThreshold?: number;
}

export class ContextAssembler {
  assemble(result: QueryResult, options: AssemblyOptions): ContextWindow {
    const entries: ContextWindowEntry[] = result.records.map((r, i) =>
      createContextWindowEntry({
        source: r.category,
        content: JSON.stringify(r.payload),
        tokenCount: Math.max(1, Math.floor(JSON.stringify(r.payload).length / 4)),
        priority: Math.max(1, options.maxEntries ? options.maxEntries - i : 1),
        provenanceChain: r.provenanceId ? [r.provenanceId] : [],
      }),
    );

    const totalTokens = entries.reduce((sum, e) => sum + e.tokenCount, 0);
    const overflow = totalTokens > options.budget;

    const window = createContextWindow({
      entries: Object.freeze(entries),
      totalTokens,
      budget: options.budget,
      overflow,
    });

    return window;
  }
}
