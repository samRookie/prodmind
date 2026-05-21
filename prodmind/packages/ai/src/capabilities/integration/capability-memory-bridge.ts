import type { ToolExecutionResult } from '../contracts/tool-result.ts';
import type { ProvenanceEntry } from '../provenance/provenance-tracker.ts';
import { ReplaySession } from '../replay/replay-session.ts';
import { ProvenanceTracker } from '../provenance/provenance-tracker.ts';

export class CapabilityMemoryBridge {
  readonly replaySession: ReplaySession;
  readonly provenanceTracker: ProvenanceTracker;
  private _executionCount = 0;

  constructor() {
    this.replaySession = new ReplaySession();
    this.provenanceTracker = new ProvenanceTracker();
  }

  get executionCount(): number {
    return this._executionCount;
  }

  recordExecution(result: ToolExecutionResult, source: string, parentTraceId?: string): void {
    this.replaySession.record(result);
    this.provenanceTracker.addEntry(
      result.request.traceId,
      source,
      result.request.toolId,
      parentTraceId,
    );
    this._executionCount++;
  }

  getProvenance(traceId: string): ProvenanceEntry | undefined {
    return this.provenanceTracker.getEntry(traceId);
  }

  getChain(traceId: string): readonly ProvenanceEntry[] {
    return this.provenanceTracker.getChain(traceId);
  }

  getReplayResults(): readonly ToolExecutionResult[] {
    return this.replaySession.replay();
  }

  clear(): void {
    this.replaySession.clear();
    this.provenanceTracker.clear();
    this._executionCount = 0;
  }
}
