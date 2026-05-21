import { generateMemoryId } from '../contracts/memory-factories.ts';
import type { MemoryRecord } from '../contracts/memory-record.ts';

export interface SessionMetadata {
  readonly id: string;
  readonly startedAt: number;
  readonly lastActiveAt: number;
  readonly stepCount: number;
  readonly status: 'active' | 'paused' | 'completed' | 'failed';
}

export class SessionState {
  private readonly _id: string;
  private _startedAt: number;
  private _lastActiveAt: number;
  private _status: 'active' | 'paused' | 'completed' | 'failed';
  private _records: MemoryRecord[] = [];
  private _tags: Set<string> = new Set();
  private _variables: Map<string, unknown> = new Map();

  constructor(id?: string) {
    this._id = id ?? generateMemoryId('session');
    this._startedAt = Date.now();
    this._lastActiveAt = this._startedAt;
    this._status = 'active';
  }

  get id(): string { return this._id; }
  get status(): string { return this._status; }
  get lastActiveAt(): number { return this._lastActiveAt; }
  get records(): readonly MemoryRecord[] { return Object.freeze([...this._records]); }
  get tags(): readonly string[] { return Object.freeze([...this._tags]); }

  get metadata(): SessionMetadata {
    return Object.freeze({
      id: this._id,
      startedAt: this._startedAt,
      lastActiveAt: this._lastActiveAt,
      stepCount: this._records.length,
      status: this._status,
    });
  }

  touch(): void {
    this._lastActiveAt = Date.now();
  }

  addRecord(record: MemoryRecord): void {
    this._records.push(record);
    this.touch();
  }

  pause(): void {
    this._status = 'paused';
    this.touch();
  }

  resume(): void {
    if (this._status === 'paused') {
      this._status = 'active';
      this.touch();
    }
  }

  complete(): void {
    this._status = 'completed';
    this.touch();
  }

  fail(): void {
    this._status = 'failed';
    this.touch();
  }

  addTag(tag: string): void {
    this._tags.add(tag);
  }

  hasTag(tag: string): boolean {
    return this._tags.has(tag);
  }

  setVariable(key: string, value: unknown): void {
    this._variables.set(key, value);
  }

  getVariable(key: string): unknown {
    return this._variables.get(key);
  }

  clearVariables(): void {
    this._variables.clear();
  }
}
