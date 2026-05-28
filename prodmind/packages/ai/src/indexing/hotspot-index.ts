import type { CognitionIndex, IndexEntry, IndexBuildInput } from './indexing-types.ts';
import { fingerprintIndex, fingerprintIndexEntry } from './index-fingerprint.ts';

export function buildHotspotIndex(input: IndexBuildInput): CognitionIndex {
  const entries: IndexEntry[] = (input.hotspots ?? []).map(h => {
    const entry: IndexEntry = {
      id: h.nodeId, key: `hotspot:${h.severity}:${h.nodeId}`,
      value: { nodeId: h.nodeId, severity: h.severity, reason: h.reason, impactedNodes: (h.impactedNodes ?? []).sort() },
      fingerprint: '',
    };
    entry.fingerprint = fingerprintIndexEntry(entry);
    return entry;
  });
  const index: CognitionIndex = { indexType: 'HOTSPOT_INDEX', entries: entries.sort((a, b) => a.key.localeCompare(b.key)), builtAt: new Date().toISOString(), fingerprint: '' };
  index.fingerprint = fingerprintIndex(index);
  return index;
}
