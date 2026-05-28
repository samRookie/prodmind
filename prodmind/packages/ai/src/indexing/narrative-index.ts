import type { CognitionIndex, IndexEntry, IndexBuildInput } from './indexing-types.ts';
import { fingerprintIndex, fingerprintIndexEntry } from './index-fingerprint.ts';

export function buildNarrativeIndex(input: IndexBuildInput): CognitionIndex {
  const entries: IndexEntry[] = (input.narratives ?? []).map(n => {
    const entry: IndexEntry = {
      id: n.id ?? n.fingerprint, key: `narrative:${n.narrativeType}`,
      value: { narrativeType: n.narrativeType, fingerprint: n.fingerprint },
      fingerprint: '',
    };
    entry.fingerprint = fingerprintIndexEntry(entry);
    return entry;
  });
  const index: CognitionIndex = { indexType: 'NARRATIVE_INDEX', entries: entries.sort((a, b) => a.key.localeCompare(b.key)), builtAt: new Date().toISOString(), fingerprint: '' };
  index.fingerprint = fingerprintIndex(index);
  return index;
}
