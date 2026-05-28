import type { CognitionIndex, IndexEntry, IndexBuildInput } from './indexing-types.ts';
import { fingerprintIndex, fingerprintIndexEntry } from './index-fingerprint.ts';

export function buildRiskIndex(input: IndexBuildInput): CognitionIndex {
  const entries: IndexEntry[] = (input.risks ?? []).map(r => {
    const entry: IndexEntry = {
      id: r.id ?? `risk:${r.riskType}:${r.normalizedScore}`,
      key: `risk:${r.severity}:${r.riskType}`,
      value: { riskType: r.riskType, severity: r.severity, normalizedScore: r.normalizedScore, impactedNodes: [...r.impactedNodes].sort() },
      fingerprint: '',
    };
    entry.fingerprint = fingerprintIndexEntry(entry);
    return entry;
  });
  const index: CognitionIndex = { indexType: 'RISK_INDEX', entries: entries.sort((a, b) => a.key.localeCompare(b.key)), builtAt: new Date().toISOString(), fingerprint: '' };
  index.fingerprint = fingerprintIndex(index);
  return index;
}
