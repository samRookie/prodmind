import type { ProviderRequest, ProviderResponse } from '../contracts.ts';
import { createProviderResponse } from '../contracts.ts';

export interface ReplayEntry {
  readonly requestHash: string;
  readonly response: ProviderResponse;
  readonly recordedAt: string;
}

export class ProviderReplayStore {
  private readonly entries: Map<string, ReplayEntry> = new Map();
  private readonly hits: Map<string, number> = new Map();

  record(request: ProviderRequest, response: ProviderResponse): void {
    const key = request.fingerprint || request.id;
    this.entries.set(key, Object.freeze({
      requestHash: key,
      response: createProviderResponse({ ...response }),
      recordedAt: new Date().toISOString(),
    }));
  }

  find(request: ProviderRequest): ProviderResponse | null {
    const key = request.fingerprint || request.id;
    const entry = this.entries.get(key);
    if (!entry) return null;
    this.hits.set(key, (this.hits.get(key) ?? 0) + 1);
    return entry.response;
  }

  getHitCount(requestHash?: string): number {
    if (requestHash) return this.hits.get(requestHash) ?? 0;
    let total = 0;
    for (const count of this.hits.values()) {
      total += count;
    }
    return total;
  }

  getEntryCount(): number {
    return this.entries.size;
  }

  getAllEntries(): readonly ReplayEntry[] {
    return Object.freeze(Array.from(this.entries.values()));
  }

  clear(requestHash?: string): void {
    if (requestHash) {
      this.entries.delete(requestHash);
      this.hits.delete(requestHash);
    } else {
      this.entries.clear();
      this.hits.clear();
    }
  }
}
