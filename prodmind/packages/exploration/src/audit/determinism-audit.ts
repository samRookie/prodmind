import type { TraversalResult } from '../types/index.ts';
import { nowISO } from '../utils/index.ts';

export class DeterminismAudit {
  private records: Map<
    string,
    Array<{ run: number; fingerprint: string; timestamp: string }>
  > = new Map();

  public recordRun(traversal: TraversalResult): void {
    if (!this.records.has(traversal.id)) {
      this.records.set(traversal.id, []);
    }
    const runs = this.records.get(traversal.id)!;
    runs.push({
      run: runs.length + 1,
      fingerprint: traversal.fingerprint,
      timestamp: nowISO(),
    });
  }

  public verifyDeterminism(traversalId: string): {
    deterministic: boolean;
    runs: number;
    fingerprints: string[];
  } {
    const runs = this.records.get(traversalId);
    if (!runs || runs.length === 0) {
      return { deterministic: true, runs: 0, fingerprints: [] };
    }
    const fingerprints = runs.map((r) => r.fingerprint);
    const first = fingerprints[0];
    const deterministic = fingerprints.every((f) => f === first);
    return { deterministic, runs: runs.length, fingerprints };
  }

  public verifyAllDeterminism(): Array<{
    traversalId: string;
    deterministic: boolean;
    runs: number;
  }> {
    const results: Array<{
      traversalId: string;
      deterministic: boolean;
      runs: number;
    }> = [];
    for (const [traversalId, runs] of this.records) {
      if (runs.length < 2) continue;
      const first = runs[0]!.fingerprint;
      const deterministic = runs.every((r) => r.fingerprint === first);
      results.push({ traversalId, deterministic, runs: runs.length });
    }
    return results;
  }

  public getNonDeterministic(): Array<{
    traversalId: string;
    fingerprints: string[];
  }> {
    const nonDet: Array<{
      traversalId: string;
      fingerprints: string[];
    }> = [];
    for (const [traversalId, runs] of this.records) {
      if (runs.length < 2) continue;
      const first = runs[0]!.fingerprint;
      const allSame = runs.every((r) => r.fingerprint === first);
      if (!allSame) {
        nonDet.push({
          traversalId,
          fingerprints: runs.map((r) => r.fingerprint),
        });
      }
    }
    return nonDet;
  }

  public clear(): void {
    this.records.clear();
  }
}
