import type { ExecutionEvent, ExecutionEventType } from '../contracts/execution-contracts.ts';

export class EventStore {
  private events: ExecutionEvent[] = [];

  append(event: ExecutionEvent): void {
    this.events.push(event);
  }

  appendBatch(events: readonly ExecutionEvent[]): void {
    for (const event of events) {
      this.events.push(event);
    }
  }

  getAll(): readonly ExecutionEvent[] {
    return Object.freeze([...this.events]);
  }

  getByNodeId(nodeId: string): readonly ExecutionEvent[] {
    return Object.freeze(
      this.events
        .filter(e => e.nodeId === nodeId)
        .sort((a, b) => a.sequenceId - b.sequenceId),
    );
  }

  getByType(type: ExecutionEventType): readonly ExecutionEvent[] {
    return Object.freeze(
      this.events
        .filter(e => e.type === type)
        .sort((a, b) => a.sequenceId - b.sequenceId),
    );
  }

  getRange(fromSequence: number, toSequence: number): readonly ExecutionEvent[] {
    return Object.freeze(
      this.events
        .filter(e => e.sequenceId >= fromSequence && e.sequenceId <= toSequence)
        .sort((a, b) => a.sequenceId - b.sequenceId),
    );
  }

  getCount(): number {
    return this.events.length;
  }

  clear(): void {
    this.events = [];
  }
}
