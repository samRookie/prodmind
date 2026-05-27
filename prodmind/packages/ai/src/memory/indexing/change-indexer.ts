import type { MemoryEntry, EvolutionEvent } from '../contracts/memory-contracts.ts';

export interface ChangeRecord {
  readonly entryId: string;
  readonly previousFingerprint: string;
  readonly newFingerprint: string;
  readonly timestamp: string;
  readonly changeType: 'created' | 'modified' | 'deleted';
}

export class ChangeIndexer {
  private readonly _changes: Map<string, ChangeRecord[]> = new Map();
  private readonly _evolutionEvents: EvolutionEvent[] = [];
  private _fingerprints: Map<string, string> = new Map();

  get totalChanges(): number {
    return [...this._changes.values()].reduce((sum, c) => sum + c.length, 0);
  }

  recordChange(entry: MemoryEntry, changeType: ChangeRecord['changeType']): ChangeRecord {
    const previousFp = this._fingerprints.get(entry.id) ?? '';
    const record: ChangeRecord = Object.freeze({
      entryId: entry.id,
      previousFingerprint: previousFp,
      newFingerprint: entry.fingerprint,
      timestamp: entry.timestamp,
      changeType,
    });

    const existing = this._changes.get(entry.id) ?? [];
    existing.push(record);
    this._changes.set(entry.id, existing);
    this._fingerprints.set(entry.id, entry.fingerprint);
    return record;
  }

  recordEvolutionEvent(event: EvolutionEvent): void {
    this._evolutionEvents.push(event);
  }

  getEntryChanges(entryId: string): readonly ChangeRecord[] {
    return Object.freeze([...(this._changes.get(entryId) ?? [])]);
  }

  getAllChanges(): readonly ChangeRecord[] {
    return Object.freeze(
      [...this._changes.values()].flat().sort((a, b) =>
        a.timestamp.localeCompare(b.timestamp),
      ),
    );
  }

  getChangesByType(changeType: ChangeRecord['changeType']): readonly ChangeRecord[] {
    return Object.freeze(
      this.getAllChanges().filter(c => c.changeType === changeType),
    );
  }

  getEvolutionEvents(): readonly EvolutionEvent[] {
    return Object.freeze([...this._evolutionEvents]);
  }

  clear(): void {
    this._changes.clear();
    this._evolutionEvents.length = 0;
    this._fingerprints.clear();
  }
}
