import type { CognitionIndex, IndexEntry, IndexBuildInput } from './indexing-types.ts';
import { fingerprintIndex, fingerprintIndexEntry } from './index-fingerprint.ts';

export function buildPatternIndex(input: IndexBuildInput): CognitionIndex {
  const entries: IndexEntry[] = (input.patterns ?? []).map(p => {
    const entry: IndexEntry = {
      id: p.id ?? `pattern:${p.patternType}`,
      key: `pattern:${p.severity}:${p.patternType}`,
      value: { patternType: p.patternType, severity: p.severity, impactedNodes: [...p.impactedNodes].sort() },
      fingerprint: '',
    };
    entry.fingerprint = fingerprintIndexEntry(entry);
    return entry;
  });
  const index: CognitionIndex = { indexType: 'PATTERN_INDEX', entries: entries.sort((a, b) => a.key.localeCompare(b.key)), builtAt: new Date().toISOString(), fingerprint: '' };
  index.fingerprint = fingerprintIndex(index);
  return index;
}
