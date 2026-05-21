import { GraphMemoryStore } from '../graph/graph-memory-store.ts';
import { type ReplayEvent,ReplayRecorder } from './replay-recorder.ts';
import { ReplayScheduler } from './replay-scheduler.ts';

export interface ReplayOptions {
  readonly speed?: number;
  readonly onEvent?: (event: ReplayEvent) => void;
}

export class ReplayEngine {
  readonly recorder: ReplayRecorder;
  readonly scheduler: ReplayScheduler;
  private readonly _store: GraphMemoryStore;

  constructor(store?: GraphMemoryStore) {
    this._store = store ?? new GraphMemoryStore();
    this.recorder = new ReplayRecorder(this._store);
    this.scheduler = new ReplayScheduler();
  }

  record(type: string, payload: Record<string, unknown>, sourceType: string, sourceId: string): ReplayEvent {
    return this.recorder.record(type, payload, sourceType, sourceId);
  }

  async replay(options?: ReplayOptions): Promise<void> {
    if (options?.speed !== undefined) this.scheduler.setSpeed(options.speed);

    if (options?.onEvent) {
      this.scheduler.on('*', options.onEvent);
    }

    await this.scheduler.replay(this.recorder.events);

    if (options?.onEvent) {
      this.scheduler.off('*', options.onEvent);
    }
  }

  snapshotAndRestore(): void {
    const snap = this._store.takeSnapshot('replay');
    const newStore = new GraphMemoryStore();
    newStore.restoreSnapshot(snap);
  }
}
