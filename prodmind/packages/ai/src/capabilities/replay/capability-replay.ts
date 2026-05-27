import type { ToolExecutionResult } from '../contracts/tool-result.ts';
import { ReplaySession } from './replay-session.ts';

export interface ReplayData {
  readonly id: string;
  readonly timestamp: number;
  readonly stepCount: number;
  readonly steps: readonly ToolExecutionResult[];
}

export interface ReplayEntry extends ReplayData {}

export class CapabilityReplay {
  private readonly _snapshots: Map<string, ReplayData> = new Map();

  takeSnapshot(session: ReplaySession, id: string): ReplayData {
    const snap: ReplayData = Object.freeze({
      id,
      timestamp: Date.now(),
      stepCount: session.count,
      steps: session.replay(),
    });
    this._snapshots.set(id, snap);
    return snap;
  }

  restoreSnapshot(session: ReplaySession, id: string): boolean {
    const snap = this._snapshots.get(id);
    if (!snap) return false;
    session.clear();
    for (const result of snap.steps) {
      session.record(result);
    }
    return true;
  }

  getSnapshot(id: string): ReplayData | undefined {
    return this._snapshots.get(id);
  }

  compare(sessionA: ReplaySession, sessionB: ReplaySession): boolean {
    const stepsA = sessionA.replay();
    const stepsB = sessionB.replay();
    if (stepsA.length !== stepsB.length) return false;
    return stepsA.every((s, i) => {
      const b = stepsB[i]!;
      return s.status === b.status && s.request.toolId === b.request.toolId;
    });
  }

  clear(): void {
    this._snapshots.clear();
  }

  get snapshotCount(): number {
    return this._snapshots.size;
  }
}
