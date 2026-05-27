import type { ProvenanceRecord } from '../contracts/provenance-record.ts';
import type { ProvenanceTracker } from './provenance-tracker.ts';

export interface ProvenanceQueryOptions {
  readonly sourceId?: string;
  readonly sourceType?: string;
  readonly orchestrationId?: string;
  readonly executionId?: string;
  readonly fingerprint?: string;
  readonly parentId?: string;
  readonly timeRange?: { readonly start: number; readonly end: number };
  readonly maxDepth?: number;
  readonly limit?: number;
}

export class ProvenanceQuery {
  private readonly _tracker: ProvenanceTracker;

  constructor(tracker: ProvenanceTracker) {
    this._tracker = tracker;
  }

  query(options: ProvenanceQueryOptions): readonly ProvenanceRecord[] {
    let results = this._tracker.records;

    if (options.sourceId) {
      results = results.filter(r => r.sourceId === options.sourceId);
    }

    if (options.sourceType) {
      results = results.filter(r => r.sourceType === options.sourceType);
    }

    if (options.orchestrationId) {
      results = results.filter(r => r.orchestrationId === options.orchestrationId);
    }

    if (options.executionId) {
      results = results.filter(r => r.executionId === options.executionId);
    }

    if (options.fingerprint) {
      results = results.filter(r => r.fingerprint === options.fingerprint);
    }

    if (options.parentId !== undefined) {
      results = results.filter(r => r.parentId === options.parentId);
    }

    if (options.timeRange) {
      const { start, end } = options.timeRange;
      results = results.filter(r => {
        const ts = parseInt(r.timestamp, 10);
        return !isNaN(ts) && ts >= start && ts <= end;
      });
    }

    if (options.maxDepth !== undefined) {
      const depthMap = this._computeDepths(results);
      results = results.filter(r => (depthMap.get(r.id) ?? 0) <= options.maxDepth!);
    }

    results = [...results].sort((a, b) => a.id.localeCompare(b.id));

    if (options.limit !== undefined) {
      results = results.slice(0, options.limit);
    }

    return Object.freeze(results);
  }

  findBySourceId(sourceId: string): readonly ProvenanceRecord[] {
    return this.query({ sourceId });
  }

  findBySourceType(sourceType: string): readonly ProvenanceRecord[] {
    return this.query({ sourceType });
  }

  findByOrchestration(orchestrationId: string): readonly ProvenanceRecord[] {
    return this.query({ orchestrationId });
  }

  findByExecution(executionId: string): readonly ProvenanceRecord[] {
    return this.query({ executionId });
  }

  findByFingerprint(fingerprint: string): readonly ProvenanceRecord[] {
    return this.query({ fingerprint });
  }

  private _computeDepths(records: readonly ProvenanceRecord[]): Map<string, number> {
    const depths = new Map<string, number>();

    const sorted = [...records].sort((a, b) => a.id.localeCompare(b.id));
    for (const record of sorted) {
      if (!record.parentId) {
        depths.set(record.id, 0);
      } else {
        const parentDepth = depths.get(record.parentId) ?? 0;
        depths.set(record.id, parentDepth + 1);
      }
    }

    return depths;
  }
}
