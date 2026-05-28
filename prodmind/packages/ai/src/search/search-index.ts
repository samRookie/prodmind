import type { SearchIndex, SearchIndexEntry, SearchType } from './search-types.ts';
import { fingerprintSearchIndex } from './search-fingerprint.ts';
import { tokenize } from './search-normalizer.ts';

export class SearchIndexBuilder {
  private entries: SearchIndexEntry[] = [];

  addEntry(input: {
    id: string; label: string; description: string;
    type: string; subsystem?: string; severity?: string;
    fingerprint: string;
  }): void {
    const tokens = tokenize(`${input.label} ${input.description} ${input.subsystem ?? ''}`);
    this.entries.push({
      id: input.id,
      label: input.label,
      description: input.description,
      type: input.type,
      subsystem: input.subsystem,
      severity: input.severity,
      fingerprint: input.fingerprint,
      tokens: [...new Set(tokens)],
    });
  }

  build(searchType: SearchType): SearchIndex {
    const index: SearchIndex = {
      searchType,
      entries: [...this.entries].sort((a, b) => a.id.localeCompare(b.id)),
      fingerprint: '',
    };
    index.fingerprint = fingerprintSearchIndex(index);
    return index;
  }

  clear(): void {
    this.entries = [];
  }
}

export function matchIndexEntries(index: SearchIndex, term: string): SearchIndexEntry[] {
  const lowerTerm = term.toLowerCase();
  return index.entries.filter(entry =>
    entry.tokens.some(t => t.includes(lowerTerm)),
  );
}
