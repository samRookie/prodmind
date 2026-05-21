export interface ProvenanceEntry {
  readonly traceId: string;
  readonly source: string;
  readonly toolId: string;
  readonly timestamp: number;
  readonly parentTraceId: string | null;
}

export class ProvenanceTracker {
  private readonly _entries: Map<string, ProvenanceEntry> = new Map();

  get entries(): ReadonlyMap<string, ProvenanceEntry> {
    return this._entries;
  }

  addEntry(traceId: string, source: string, toolId: string, parentTraceId?: string): void {
    this._entries.set(traceId, Object.freeze({
      traceId, source, toolId,
      timestamp: Date.now(),
      parentTraceId: parentTraceId ?? null,
    }));
  }

  getEntry(traceId: string): ProvenanceEntry | undefined {
    return this._entries.get(traceId);
  }

  getChain(traceId: string): readonly ProvenanceEntry[] {
    const chain: ProvenanceEntry[] = [];
    let current: ProvenanceEntry | undefined = this._entries.get(traceId);
    while (current) {
      chain.push(current);
      current = current.parentTraceId ? this._entries.get(current.parentTraceId) : undefined;
    }
    return Object.freeze(chain);
  }

  getBySource(source: string): readonly ProvenanceEntry[] {
    return Object.freeze(
      [...this._entries.values()].filter(e => e.source === source),
    );
  }

  clear(): void {
    this._entries.clear();
  }
}
