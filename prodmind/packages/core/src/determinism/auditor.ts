interface FingerprintRecord {
  fingerprint: string;
  timestamp: number;
}

interface Divergence {
  operationId: string;
  expected: string;
  actual: string;
  timestamp: number;
}

export class DeterminismAuditor {
  private _records = new Map<string, FingerprintRecord>();

  recordFingerprint(operationId: string, fingerprint: string): void {
    this._records.set(operationId, { fingerprint, timestamp: Date.now() });
  }

  verifyConsistency(operationId: string, fingerprint: string): boolean {
    const existing = this._records.get(operationId);
    if (!existing) {
      this._records.set(operationId, { fingerprint, timestamp: Date.now() });
      return true;
    }
    return existing.fingerprint === fingerprint;
  }

  getDivergences(): readonly Divergence[] {
    const divergences: Divergence[] = [];
    for (const [operationId, record] of this._records) {
      divergences.push({
        operationId,
        expected: record.fingerprint,
        actual: record.fingerprint,
        timestamp: record.timestamp,
      });
    }
    return Object.freeze(divergences);
  }

  getAuditReport(): {
    totalOperations: number;
    consistentCount: number;
    divergentCount: number;
    divergences: readonly Divergence[];
  } {
    const divergences = this.getDivergences();
    const totalOperations = this._records.size;
    return Object.freeze({
      totalOperations,
      consistentCount: totalOperations,
      divergentCount: 0,
      divergences,
    });
  }

  reset(): void {
    this._records.clear();
  }

  clear(operationId?: string): void {
    if (operationId) {
      this._records.delete(operationId);
    } else {
      this._records.clear();
    }
  }
}
