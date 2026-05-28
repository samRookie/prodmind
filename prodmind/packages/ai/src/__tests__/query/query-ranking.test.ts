import { describe, it, expect } from 'vitest';
import { rankResults } from '../../query/query-ranking.ts';

describe('QueryRanking', () => {
  it('ranks results by score descending', () => {
    const result = {
      queryType: 'NODE_QUERY' as const, fingerprint: 'fp',
      data: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
      total: 3, offset: 0, limit: 10, executionTimeMs: 0,
    };
    const ranked = rankResults(result, (item) => item.name === 'b' ? 10 : 1);
    expect(ranked).toHaveLength(3);
    expect(ranked[0]!.data.name).toBe('b');
    expect(ranked[0]!.score).toBe(10);
    expect(ranked[0]!.rank).toBe(1);
  });
});
