import type { MemoryEntry, ArchitecturalFinding } from '../contracts/memory-contracts.ts';

export interface RetrievalFilterCriteria {
  readonly categories?: readonly string[];
  readonly tags?: readonly string[];
  readonly minTimestamp?: string;
  readonly maxTimestamp?: string;
  readonly fingerprintPrefix?: string;
  readonly provenanceId?: string;
}

export class RetrievalFilter {
  applyEntryFilter(entries: readonly MemoryEntry[], criteria: RetrievalFilterCriteria): readonly MemoryEntry[] {
    let filtered = [...entries];

    if (criteria.categories && criteria.categories.length > 0) {
      const catSet = new Set(criteria.categories);
      filtered = filtered.filter(e => catSet.has(e.category));
    }

    if (criteria.tags && criteria.tags.length > 0) {
      const tagSet = new Set(criteria.tags);
      filtered = filtered.filter(e => e.tags.some(t => tagSet.has(t)));
    }

    if (criteria.minTimestamp) {
      filtered = filtered.filter(e => e.timestamp >= criteria.minTimestamp!);
    }

    if (criteria.maxTimestamp) {
      filtered = filtered.filter(e => e.timestamp <= criteria.maxTimestamp!);
    }

    if (criteria.fingerprintPrefix) {
      filtered = filtered.filter(e => e.fingerprint.startsWith(criteria.fingerprintPrefix!));
    }

    if (criteria.provenanceId) {
      filtered = filtered.filter(e => e.provenanceId === criteria.provenanceId);
    }

    return Object.freeze(filtered.sort((a, b) => a.id.localeCompare(b.id)));
  }

  applyFindingFilter(findings: readonly ArchitecturalFinding[], criteria: RetrievalFilterCriteria): readonly ArchitecturalFinding[] {
    let filtered = [...findings];

    if (criteria.categories && criteria.categories.length > 0) {
      const catSet = new Set(criteria.categories);
      filtered = filtered.filter(f => catSet.has(f.findingType));
    }

    if (criteria.minTimestamp) {
      filtered = filtered.filter(f => f.timestamp >= criteria.minTimestamp!);
    }

    if (criteria.maxTimestamp) {
      filtered = filtered.filter(f => f.timestamp <= criteria.maxTimestamp!);
    }

    return Object.freeze(filtered.sort((a, b) => a.id.localeCompare(b.id)));
  }

  filterBySeverity(findings: readonly ArchitecturalFinding[], minSeverity: string): readonly ArchitecturalFinding[] {
    const severityOrder = ['info', 'warning', 'critical'];
    const minIdx = severityOrder.indexOf(minSeverity);
    if (minIdx === -1) return findings;

    return Object.freeze(
      findings.filter(f => severityOrder.indexOf(f.severity) >= minIdx)
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
  }
}
