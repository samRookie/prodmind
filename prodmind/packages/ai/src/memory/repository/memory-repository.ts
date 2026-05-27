import { SnapshotMemory } from './snapshot-memory.ts';
import { SemanticMemoryStore } from './semantic-memory.ts';
import { GraphMemoryStoreRepo } from './graph-memory.ts';
import { MetricsMemoryStore } from './metrics-memory.ts';
import { ReasoningMemoryStore } from './reasoning-memory.ts';
import type { MemoryEntry, ArchitecturalFinding } from '../contracts/memory-contracts.ts';
import { computeMemoryFingerprint } from '../hashing/memory-fingerprint.ts';

export class MemoryRepository {
  readonly snapshots: SnapshotMemory;
  readonly semantic: SemanticMemoryStore;
  readonly graph: GraphMemoryStoreRepo;
  readonly metrics: MetricsMemoryStore;
  readonly reasoning: ReasoningMemoryStore;

  private _entries: Map<string, MemoryEntry> = new Map();
  private _findings: Map<string, ArchitecturalFinding> = new Map();
  private _entryLog: string[] = [];

  constructor() {
    this.snapshots = new SnapshotMemory();
    this.semantic = new SemanticMemoryStore();
    this.graph = new GraphMemoryStoreRepo();
    this.metrics = new MetricsMemoryStore();
    this.reasoning = new ReasoningMemoryStore();
  }

  get entryCount(): number {
    return this._entries.size;
  }

  get findingCount(): number {
    return this._findings.size;
  }

  storeEntry(entry: MemoryEntry): void {
    this._entries.set(entry.id, entry);
    this._entryLog.push(entry.id);
  }

  getEntry(id: string): MemoryEntry | undefined {
    return this._entries.get(id);
  }

  getEntries(ids: readonly string[]): readonly MemoryEntry[] {
    return Object.freeze(
      ids.map(id => this._entries.get(id)).filter((e): e is MemoryEntry => e !== undefined),
    );
  }

  getAllEntries(): readonly MemoryEntry[] {
    return Object.freeze(
      [...this._entries.values()].sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  getEntriesByCategory(category: string): readonly MemoryEntry[] {
    return Object.freeze(
      [...this._entries.values()]
        .filter(e => e.category === category)
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  storeFinding(finding: ArchitecturalFinding): void {
    this._findings.set(finding.id, finding);
  }

  getFinding(id: string): ArchitecturalFinding | undefined {
    return this._findings.get(id);
  }

  getAllFindings(): readonly ArchitecturalFinding[] {
    return Object.freeze(
      [...this._findings.values()].sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  getFindingsByType(findingType: string): readonly ArchitecturalFinding[] {
    return Object.freeze(
      [...this._findings.values()]
        .filter(f => f.findingType === findingType)
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  getEntryHistory(): readonly string[] {
    return Object.freeze([...this._entryLog]);
  }

  computeRepositoryFingerprint(): string {
    const parts = this.getAllEntries().map(e => `${e.id}:${e.fingerprint}`);
    return computeMemoryFingerprint(parts);
  }

  clear(): void {
    this._entries.clear();
    this._findings.clear();
    this._entryLog = [];
    this.snapshots.clear();
    this.semantic.clear();
    this.graph.clear();
    this.metrics.clear();
    this.reasoning.clear();
  }
}
