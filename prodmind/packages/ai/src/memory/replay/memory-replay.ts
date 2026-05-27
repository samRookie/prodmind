import type { MemoryEntry } from '../contracts/memory-contracts.ts';
import { MemoryRepository } from '../repository/memory-repository.ts';

export interface ReplayCheckpoint {
  readonly id: string;
  readonly timestamp: number;
  readonly entryFingerprints: readonly string[];
  readonly repositoryFingerprint: string;
}

let checkpointIdCounter = 0;

export class MemoryReplay {
  private readonly _checkpoints: Map<string, ReplayCheckpoint> = new Map();
  private readonly _entryHistory: Map<string, MemoryEntry[]> = new Map();

  get checkpointCount(): number {
    return this._checkpoints.size;
  }

  createCheckpoint(repository: MemoryRepository): ReplayCheckpoint {
    checkpointIdCounter++;
    const id = `ckpt_${checkpointIdCounter}`;
    const entryFingerprints = repository.getAllEntries().map(e => e.fingerprint);
    const repoFp = repository.computeRepositoryFingerprint();

    const cp: ReplayCheckpoint = Object.freeze({
      id,
      timestamp: Date.now(),
      entryFingerprints: Object.freeze(entryFingerprints),
      repositoryFingerprint: repoFp,
    });

    this._checkpoints.set(id, cp);

    const history = repository.getAllEntries();
    this._entryHistory.set(id, [...history]);

    return cp;
  }

  getCheckpoint(id: string): ReplayCheckpoint | undefined {
    return this._checkpoints.get(id);
  }

  getEntryHistory(id: string): readonly MemoryEntry[] | undefined {
    const entries = this._entryHistory.get(id);
    return entries ? Object.freeze([...entries]) : undefined;
  }

  compareCheckpoints(idA: string, idB: string): { added: readonly string[]; removed: readonly string[]; unchanged: boolean } {
    const cpA = this._checkpoints.get(idA);
    const cpB = this._checkpoints.get(idB);
    if (!cpA || !cpB) {
      return Object.freeze({ added: Object.freeze([]), removed: Object.freeze([]), unchanged: cpA === cpB });
    }

    const setA = new Set(cpA.entryFingerprints);
    const setB = new Set(cpB.entryFingerprints);
    const added = cpB.entryFingerprints.filter(fp => !setA.has(fp));
    const removed = cpA.entryFingerprints.filter(fp => !setB.has(fp));

    return Object.freeze({
      added: Object.freeze(added),
      removed: Object.freeze(removed),
      unchanged: added.length === 0 && removed.length === 0,
    });
  }

  verifyIntegrity(checkpointId: string, repository: MemoryRepository): boolean {
    const cp = this._checkpoints.get(checkpointId);
    if (!cp) return false;
    const currentFp = repository.computeRepositoryFingerprint();
    return currentFp === cp.repositoryFingerprint;
  }

  replayEntries(_repository: MemoryRepository, checkpointId: string): readonly MemoryEntry[] {
    const history = this._entryHistory.get(checkpointId);
    if (!history) return Object.freeze([]);
    return Object.freeze([...history]);
  }

  clear(): void {
    this._checkpoints.clear();
    this._entryHistory.clear();
  }
}
