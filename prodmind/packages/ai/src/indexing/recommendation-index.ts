import type { CognitionIndex, IndexEntry, IndexBuildInput } from './indexing-types.ts';
import { fingerprintIndex, fingerprintIndexEntry } from './index-fingerprint.ts';

export function buildRecommendationIndex(input: IndexBuildInput): CognitionIndex {
  const entries: IndexEntry[] = (input.recommendations ?? []).map(r => {
    const entry: IndexEntry = {
      id: r.id ?? `rec:${r.category}:${r.priority}`,
      key: `recommendation:${r.priority}:${r.category}`,
      value: { category: r.category, priority: r.priority, title: r.title, impactedNodes: [...r.impactedNodes].sort() },
      fingerprint: '',
    };
    entry.fingerprint = fingerprintIndexEntry(entry);
    return entry;
  });
  const index: CognitionIndex = { indexType: 'RECOMMENDATION_INDEX', entries: entries.sort((a, b) => a.key.localeCompare(b.key)), builtAt: new Date().toISOString(), fingerprint: '' };
  index.fingerprint = fingerprintIndex(index);
  return index;
}
