import type { CognitionIndex, IndexEntry, IndexBuildInput } from './indexing-types.ts';
import { fingerprintIndex, fingerprintIndexEntry } from './index-fingerprint.ts';

export function buildTrendIndex(input: IndexBuildInput): CognitionIndex {
  const entries: IndexEntry[] = (input.trends ?? []).map(t => {
    const entry: IndexEntry = {
      id: t.fingerprint, key: `trend:${t.trendType}:${t.direction}`,
      value: { trendType: t.trendType, direction: t.direction, fingerprint: t.fingerprint },
      fingerprint: '',
    };
    entry.fingerprint = fingerprintIndexEntry(entry);
    return entry;
  });
  const index: CognitionIndex = { indexType: 'TREND_INDEX', entries: entries.sort((a, b) => a.key.localeCompare(b.key)), builtAt: new Date().toISOString(), fingerprint: '' };
  index.fingerprint = fingerprintIndex(index);
  return index;
}
