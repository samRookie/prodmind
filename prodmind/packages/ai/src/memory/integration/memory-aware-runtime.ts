import type { ContextWindow } from '../contracts/context-window.ts';
import type { RetrievalQuery } from '../contracts/retrieval-query.ts';
import type { AssemblyOptions } from '../retrieval/context-assembler.ts';
import { MemoryIntegration } from './memory-integration.ts';

export class MemoryAwareRuntime {
  private readonly _memory: MemoryIntegration;

  constructor(memory?: MemoryIntegration) {
    this._memory = memory ?? new MemoryIntegration();
  }

  get memory(): MemoryIntegration {
    return this._memory;
  }

  async runWithMemory<T>(action: string, fn: () => Promise<T>): Promise<T> {
    const stepId = this._memory.beginExecution(action);

    try {
      const result = await fn();
      this._memory.completeExecution(stepId, { result } as never, 0);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this._memory.failExecution(stepId, msg);
      throw err;
    }
  }

  retrieve(query: RetrievalQuery) {
    return this._memory.query(query);
  }

  assemble(query: RetrievalQuery, options: AssemblyOptions): ContextWindow {
    return this._memory.assemble(query, options);
  }

  reset(): void {
    this._memory.reset();
  }
}
