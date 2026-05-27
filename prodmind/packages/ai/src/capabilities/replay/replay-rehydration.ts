import type { ToolExecutionResult } from '../contracts/tool-result.ts';
import { ReplaySession } from './replay-session.ts';

export interface RehydrationState {
  readonly session: ReplaySession;
  readonly restoredCount: number;
  readonly fingerprint: string;
}

export class ReplayRehydration {
  rehydrate(session: ReplaySession, results: readonly ToolExecutionResult[]): RehydrationState {
    session.clear();
    for (const result of results) {
      session.record(result);
    }
    return Object.freeze({
      session,
      restoredCount: results.length,
      fingerprint: this._computeFingerprint(results),
    });
  }

  rehydrateFromSnapshot(session: ReplaySession, snapshot: { readonly steps: readonly ToolExecutionResult[] }): RehydrationState {
    return this.rehydrate(session, snapshot.steps);
  }

  private _computeFingerprint(results: readonly ToolExecutionResult[]): string {
    const parts = results.map(r => `${r.request.toolId}:${r.status}`);
    return parts.join('|');
  }
}
