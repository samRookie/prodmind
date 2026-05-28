import type { CognitionIndex, IndexEntry, IndexBuildInput } from './indexing-types.ts';
import { fingerprintIndex, fingerprintIndexEntry } from './index-fingerprint.ts';

export function buildCognitionIndex(input: IndexBuildInput): CognitionIndex {
  const entries: IndexEntry[] = (input.cognitions ?? []).map(c => {
    const entry: IndexEntry = {
      id: c.id ?? c.fingerprint,
      key: `cognition:${c.cognitionType}`,
      value: { cognitionType: c.cognitionType, fingerprint: c.fingerprint },
      fingerprint: '',
    };
    entry.fingerprint = fingerprintIndexEntry(entry);
    return entry;
  });

  const index: CognitionIndex = {
    indexType: 'COGNITION_INDEX',
    entries: entries.sort((a, b) => a.key.localeCompare(b.key)),
    builtAt: new Date().toISOString(),
    fingerprint: '',
  };
  index.fingerprint = fingerprintIndex(index);
  return index;
}
