import { now } from '@prodmind/db';

import type { ExecutionSnapshot } from './execution-snapshot.ts';
import { snapshotToDbRow } from './execution-snapshot.ts';

export class ExecutionStore {
  private readonly snapshots = new Map<string, Record<string, unknown>>();

  public save(snapshot: ExecutionSnapshot): Promise<void> {
    this.snapshots.set(snapshot.id, { ...snapshotToDbRow(snapshot), createdAt: now() });
    return Promise.resolve();
  }

  public findById(id: string): Promise<Record<string, unknown> | null> {
    return Promise.resolve(this.snapshots.get(id) ?? null);
  }

  public findByCorrelationId(correlationId: string): Promise<Record<string, unknown>[]> {
    return Promise.resolve([...this.snapshots.values()].filter((s) => s.correlationId === correlationId));
  }

  public findByFingerprint(fingerprint: string): Promise<Record<string, unknown>[]> {
    return Promise.resolve([...this.snapshots.values()].filter((s) => s.executionFingerprint === fingerprint));
  }

  public getAll(): Record<string, unknown>[] {
    return [...this.snapshots.values()];
  }
}
