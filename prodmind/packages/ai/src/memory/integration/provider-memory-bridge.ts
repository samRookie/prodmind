import type { ContextWindow } from '../contracts/context-window.ts';
import type { RetrievalQuery } from '../contracts/retrieval-query.ts';
import { MemoryIntegration } from './memory-integration.ts';
import { ContextAssembler, type AssemblyOptions } from '../retrieval/context-assembler.ts';

export interface ProviderContext {
  readonly query: string;
  readonly contextWindow: ContextWindow;
  readonly provenance: readonly string[];
  readonly assembledAt: number;
}

export class ProviderMemoryBridge {
  private readonly _memory: MemoryIntegration;
  private readonly _assembler: ContextAssembler;

  constructor(memory?: MemoryIntegration) {
    this._memory = memory ?? new MemoryIntegration();
    this._assembler = new ContextAssembler();
  }

  get memory(): MemoryIntegration {
    return this._memory;
  }

  injectContext(query: RetrievalQuery, options: AssemblyOptions): ProviderContext {
    const result = this._memory.query(query);
    const contextWindow = this._assembler.assemble(result, options);

    return Object.freeze({
      query: JSON.stringify(query),
      contextWindow,
      provenance: contextWindow.entries.flatMap(e => e.provenanceChain),
      assembledAt: Date.now(),
    });
  }

  injectStringified(query: RetrievalQuery, options: AssemblyOptions): string {
    const ctx = this.injectContext(query, options);
    const entries = ctx.contextWindow.entries.map(e =>
      `[${e.source}] (priority:${e.priority}) ${e.content}`,
    );
    return entries.join('\n---\n');
  }

  injectAsRecords(query: RetrievalQuery, options: AssemblyOptions): readonly Record<string, unknown>[] {
    const ctx = this.injectContext(query, options);
    return Object.freeze(
      ctx.contextWindow.entries.map(e => ({
        source: e.source,
        content: e.content,
        priority: e.priority,
        tokens: e.tokenCount,
      })),
    );
  }
}
