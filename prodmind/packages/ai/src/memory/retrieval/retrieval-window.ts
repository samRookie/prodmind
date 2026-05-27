import type { ContextWindow, ContextWindowEntry } from '../contracts/context-window.ts';
import { createContextWindow, createContextWindowEntry } from '../contracts/memory-factories.ts';
import type { QueryResult } from '../graph/graph-query.ts';

export interface WindowSegment {
  readonly offset: number;
  readonly size: number;
  readonly entries: readonly ContextWindowEntry[];
  readonly totalTokens: number;
}

export class RetrievalWindow {
  slice(result: QueryResult, offset: number, size: number): WindowSegment {
    const records = result.records.slice(offset, offset + size);
    const entries: ContextWindowEntry[] = records.map((r, i) =>
      createContextWindowEntry({
        source: r.category,
        content: JSON.stringify(r.payload),
        tokenCount: Math.max(1, Math.floor(JSON.stringify(r.payload).length / 4)),
        priority: Math.max(1, size - i),
        provenanceChain: r.provenanceId ? [r.provenanceId] : [],
      }),
    );

    const totalTokens = entries.reduce((sum, e) => sum + e.tokenCount, 0);

    return Object.freeze({
      offset,
      size: entries.length,
      entries: Object.freeze(entries),
      totalTokens,
    });
  }

  windowFromResult(result: QueryResult, budget: number): ContextWindow {
    const entries: ContextWindowEntry[] = result.records.map((r, i) =>
      createContextWindowEntry({
        source: r.category,
        content: JSON.stringify(r.payload),
        tokenCount: Math.max(1, Math.floor(JSON.stringify(r.payload).length / 4)),
        priority: Math.max(1, result.records.length - i),
        provenanceChain: r.provenanceId ? [r.provenanceId] : [],
      }),
    );

    return createContextWindow({
      entries: Object.freeze(
        [...entries].sort((a, b) => b.priority - a.priority),
      ),
      totalTokens: entries.reduce((sum, e) => sum + e.tokenCount, 0),
      budget,
      overflow: entries.reduce((sum, e) => sum + e.tokenCount, 0) > budget,
    });
  }

  partition(result: QueryResult, segmentSize: number): readonly WindowSegment[] {
    const segments: WindowSegment[] = [];
    let offset = 0;

    while (offset < result.records.length) {
      segments.push(this.slice(result, offset, segmentSize));
      offset += segmentSize;
    }

    return Object.freeze(segments);
  }

  trimToBudget(window: ContextWindow, maxTokens: number): ContextWindow {
    const sorted = [...window.entries].sort((a, b) => b.priority - a.priority);
    const kept: ContextWindowEntry[] = [];
    let running = 0;

    for (const entry of sorted) {
      if (running + entry.tokenCount <= maxTokens) {
        kept.push(entry);
        running += entry.tokenCount;
      }
    }

    return createContextWindow({
      entries: Object.freeze(kept.sort((a, b) => b.priority - a.priority)),
      totalTokens: running,
      budget: window.budget,
      overflow: false,
      provenance: [...window.provenance],
    });
  }
}
