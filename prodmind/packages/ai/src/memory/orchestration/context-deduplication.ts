import type { MemoryEntry, ArchitecturalFinding } from '../contracts/memory-contracts.ts';

export class ContextDeduplication {
  deduplicateEntries(entries: readonly MemoryEntry[]): readonly MemoryEntry[] {
    const seen = new Map<string, MemoryEntry>();
    for (const entry of entries) {
      const key = this._entryKey(entry);
      const existing = seen.get(key);
      if (!existing || entry.timestamp > existing.timestamp) {
        seen.set(key, entry);
      }
    }
    return Object.freeze(
      [...seen.values()].sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  deduplicateFindings(findings: readonly ArchitecturalFinding[]): readonly ArchitecturalFinding[] {
    const seen = new Map<string, ArchitecturalFinding>();
    for (const finding of findings) {
      const key = `${finding.findingType}|${finding.label}`;
      if (!seen.has(key)) {
        seen.set(key, finding);
      }
    }
    return Object.freeze(
      [...seen.values()].sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  deduplicateByFingerprint(entries: readonly MemoryEntry[]): readonly MemoryEntry[] {
    const seen = new Map<string, MemoryEntry>();
    for (const entry of entries) {
      if (entry.fingerprint && !seen.has(entry.fingerprint)) {
        seen.set(entry.fingerprint, entry);
      }
    }
    return Object.freeze(
      [...seen.values()].sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  mergeDeduplicated(prevEntries: readonly MemoryEntry[], newEntries: readonly MemoryEntry[]): readonly MemoryEntry[] {
    const seen = new Map<string, MemoryEntry>();
    for (const entry of [...prevEntries, ...newEntries]) {
      const key = this._entryKey(entry);
      const existing = seen.get(key);
      if (!existing || entry.timestamp > existing.timestamp) {
        seen.set(key, entry);
      }
    }
    return Object.freeze(
      [...seen.values()].sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  private _entryKey(entry: MemoryEntry): string {
    return `${entry.category}|${entry.fingerprint}|${entry.content}`;
  }
}
