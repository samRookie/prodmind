import type { ToolExecutionResult } from '../contracts/tool-result.ts';
import { ReplaySession } from './replay-session.ts';
import { CapabilityReplay } from './capability-replay.ts';

export interface SnapshotDiff {
  readonly added: readonly ToolExecutionResult[];
  readonly removed: readonly ToolExecutionResult[];
  readonly identical: boolean;
}

export class ReplaySnapshot {
  private readonly _replay: CapabilityReplay;
  private _snapshotIdCounter = 0;

  constructor(replay?: CapabilityReplay) {
    this._replay = replay ?? new CapabilityReplay();
  }

  get replay(): CapabilityReplay {
    return this._replay;
  }

  snapshot(session: ReplaySession, label?: string): string {
    this._snapshotIdCounter++;
    const id = label ?? `snap_${this._snapshotIdCounter}`;
    this._replay.takeSnapshot(session, id);
    return id;
  }

  restore(session: ReplaySession, id: string): boolean {
    return this._replay.restoreSnapshot(session, id);
  }

  diff(sessionA: ReplaySession, sessionB: ReplaySession): SnapshotDiff {
    const stepsA = sessionA.replay();
    const stepsB = sessionB.replay();
    const setB = new Set(stepsB.map(s => `${s.request.toolId}_${s.status}`));
    const added = stepsA.filter(s => !setB.has(`${s.request.toolId}_${s.status}`));
    const setA = new Set(stepsA.map(s => `${s.request.toolId}_${s.status}`));
    const removed = stepsB.filter(s => !setA.has(`${s.request.toolId}_${s.status}`));

    return Object.freeze({
      added: Object.freeze(added),
      removed: Object.freeze(removed),
      identical: added.length === 0 && removed.length === 0,
    });
  }
}
