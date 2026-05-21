import { createMemoryRecord } from '../contracts/memory-factories.ts';
import type { GraphMemoryStore } from '../graph/graph-memory-store.ts';
import { ExecutionMemory } from './execution-memory.ts';
import { SessionState } from './session-state.ts';

export interface ExecutionContextOptions {
  readonly sessionId?: string;
  readonly tags?: readonly string[];
}

export class ExecutionContext {
  readonly execution: ExecutionMemory;
  readonly session: SessionState;
  private readonly _store?: GraphMemoryStore;

  constructor(store?: GraphMemoryStore, options?: ExecutionContextOptions) {
    this.execution = new ExecutionMemory();
    this.session = new SessionState(options?.sessionId);
    this._store = store;

    if (options?.tags) {
      for (const tag of options.tags) this.session.addTag(tag);
    }
  }

  begin(action: string, input?: Record<string, unknown>): string {
    const stepId = this.execution.beginStep(action, input);
    const record = createMemoryRecord({
      category: 'execution',
      payload: { action, input, stepId, sessionId: this.session.id },
    });
    this.session.addRecord(record);
    if (this._store) this._store.storeRecord(record);
    return stepId;
  }

  complete(stepId: string, output: Record<string, unknown>, duration: number): void {
    this.execution.completeStep(stepId, output, duration);
    this.session.touch();
  }

  fail(stepId: string, error: string): void {
    this.execution.failStep(stepId, error);
    this.session.fail();
  }

  snapshot(): { execution: readonly import('./execution-memory.ts').ExecutionStep[]; session: import('./session-state.ts').SessionMetadata } {
    return {
      execution: this.execution.steps,
      session: this.session.metadata,
    };
  }
}
