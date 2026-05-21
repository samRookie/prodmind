import { createMemoryRecord, generateMemoryId } from '../contracts/memory-factories.ts';
import type { MemoryRecord } from '../contracts/memory-record.ts';

export interface ExecutionStep {
  id: string;
  action: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  duration: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp: number;
}

export class ExecutionMemory {
  private readonly _records: Map<string, MemoryRecord> = new Map();
  private readonly _steps: ExecutionStep[] = [];
  private _currentId: string | undefined;

  get records(): readonly MemoryRecord[] {
    return Object.freeze([...this._records.values()]
      .sort((a, b) => a.id.localeCompare(b.id)));
  }

  get steps(): readonly ExecutionStep[] {
    return Object.freeze([...this._steps]);
  }

  get currentId(): string | undefined {
    return this._currentId;
  }

  beginStep(action: string, input: Record<string, unknown> = {}): string {
    const id = generateMemoryId('exec');
    const step: ExecutionStep = {
      id, action, input, output: {},
      duration: 0, status: 'running', timestamp: Date.now(),
    };
    this._steps.push(step);

    const record = createMemoryRecord({
      category: 'execution',
      payload: { action, input, status: 'running' },
      metadata: { stepId: id },
    });
    this._records.set(record.id, record);
    this._currentId = id;
    return id;
  }

  completeStep(id: string, output: Record<string, unknown>, duration: number): void {
    const step = this._steps.find(s => s.id === id);
    if (!step) return;
    step.output = output;
    step.duration = duration;
    step.status = 'completed';

    const match = [...this._records.values()].find(r =>
      r.metadata?.stepId === id,
    );
    if (match) {
      this._records.set(match.id, {
        ...match,
        payload: { ...match.payload, output, status: 'completed', duration },
      } as MemoryRecord);
    }
    if (this._currentId === id) this._currentId = undefined;
  }

  failStep(id: string, error: string): void {
    const step = this._steps.find(s => s.id === id);
    if (!step) return;
    step.output = { error };
    step.status = 'failed';

    const match = [...this._records.values()].find(r =>
      r.metadata?.stepId === id,
    );
    if (match) {
      this._records.set(match.id, {
        ...match,
        payload: { ...match.payload, error, status: 'failed' },
      } as MemoryRecord);
    }
    if (this._currentId === id) this._currentId = undefined;
  }

  getStep(id: string): ExecutionStep | undefined {
    return this._steps.find(s => s.id === id);
  }

  getStepsByAction(action: string): readonly ExecutionStep[] {
    return Object.freeze(
      this._steps.filter(s => s.action === action)
        .sort((a, b) => a.timestamp - b.timestamp),
    );
  }

  clear(): void {
    this._records.clear();
    this._steps.length = 0;
    this._currentId = undefined;
  }

  get stepCount(): number {
    return this._steps.length;
  }
}
