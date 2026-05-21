import type { ReplayEvent } from './replay-recorder.ts';

export type ReplayHandler = (event: ReplayEvent) => void;

export class ReplayScheduler {
  private readonly _handlers: Map<string, ReplayHandler[]> = new Map();
  private _speed: number = 1;

  get speed(): number { return this._speed; }

  setSpeed(speed: number): void {
    this._speed = Math.max(0.1, speed);
  }

  on(type: string, handler: ReplayHandler): void {
    const existing = this._handlers.get(type);
    if (existing) {
      existing.push(handler);
    } else {
      this._handlers.set(type, [handler]);
    }
  }

  off(type: string, handler: ReplayHandler): void {
    const existing = this._handlers.get(type);
    if (!existing) return;
    const idx = existing.indexOf(handler);
    if (idx >= 0) existing.splice(idx, 1);
  }

  async replay(events: readonly ReplayEvent[]): Promise<void> {
    for (const event of events) {
      await this.dispatch(event);
    }
  }

  private async dispatch(event: ReplayEvent): Promise<void> {
    const handlers = this._handlers.get(event.type) ?? [];
    const wildcard = this._handlers.get('*') ?? [];

    for (const handler of [...handlers, ...wildcard]) {
      handler(event);
    }

    if (this._speed > 0) {
      await new Promise(resolve => setTimeout(resolve, 10 / this._speed));
    }
  }

  clearHandlers(): void {
    this._handlers.clear();
  }
}
