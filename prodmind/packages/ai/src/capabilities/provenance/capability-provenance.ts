import type { ToolExecutionResult } from '../contracts/tool-result.ts';
import { ProvenanceTracker } from './provenance-tracker.ts';

export interface CapabilityProvenanceEntry {
  readonly traceId: string;
  readonly capabilityType: string;
  readonly toolId: string;
  readonly workflowId?: string;
  readonly status: string;
  readonly timestamp: number;
  readonly parentTraceId?: string;
}

export interface ProvenanceRecord extends CapabilityProvenanceEntry {}

export class CapabilityProvenance {
  private readonly _tracker: ProvenanceTracker;
  private readonly _entries: CapabilityProvenanceEntry[] = [];

  constructor(tracker?: ProvenanceTracker) {
    this._tracker = tracker ?? new ProvenanceTracker();
  }

  get tracker(): ProvenanceTracker {
    return this._tracker;
  }

  record(result: ToolExecutionResult, capabilityType: string, parentTraceId?: string): CapabilityProvenanceEntry {
    const entry: CapabilityProvenanceEntry = Object.freeze({
      traceId: result.request.traceId,
      capabilityType,
      toolId: result.request.toolId,
      status: result.status,
      timestamp: Date.now(),
      parentTraceId,
    });
    this._entries.push(entry);
    this._tracker.addEntry(result.request.traceId, capabilityType, result.request.toolId, parentTraceId);
    return entry;
  }

  getByTraceId(traceId: string): CapabilityProvenanceEntry | undefined {
    return this._entries.find(e => e.traceId === traceId);
  }

  getByCapabilityType(capabilityType: string): readonly CapabilityProvenanceEntry[] {
    return Object.freeze(
      this._entries.filter(e => e.capabilityType === capabilityType)
        .sort((a, b) => a.timestamp - b.timestamp),
    );
  }

  getChain(traceId: string): readonly CapabilityProvenanceEntry[] {
    const chain: CapabilityProvenanceEntry[] = [];
    let current = this.getByTraceId(traceId);
    while (current) {
      chain.push(current);
      current = current.parentTraceId ? this.getByTraceId(current.parentTraceId) : undefined;
    }
    return Object.freeze(chain);
  }

  get entries(): readonly CapabilityProvenanceEntry[] {
    return Object.freeze([...this._entries]);
  }

  clear(): void {
    this._entries.length = 0;
    this._tracker.clear();
  }
}
