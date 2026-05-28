import { describe, it, expect } from 'vitest';
import { rankMatches } from '../../search/search-ranking.ts';
import type { SearchIndexEntry } from '../../search/search-types.ts';

describe('SearchRanking', () => {
  it('returns empty for empty input', () => {
    const result = rankMatches([], '', 'EXACT');
    expect(result).toHaveLength(0);
  });

  it('returns ranked matches', () => {
    const entries: SearchIndexEntry[] = [
      { id: 'n1', label: 'core-module', description: '', type: 'module', subsystem: 'engine', fingerprint: 'fp1', tokens: ['core-module'] },
      { id: 'n2', label: 'other', description: '', type: 'module', subsystem: 'engine', fingerprint: 'fp2', tokens: ['other'] },
    ];
    const result = rankMatches(entries, 'core-module', 'EXACT');
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('n1');
  });
});
