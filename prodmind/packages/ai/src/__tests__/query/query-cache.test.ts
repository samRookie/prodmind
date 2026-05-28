import { describe, it, expect } from 'vitest';
import { QueryCache } from '../../query/query-cache.ts';

describe('QueryCache', () => {
  it('stores and retrieves entries', () => {
    const cache = new QueryCache();
    cache.set('fp1', { queryType: 'NODE_QUERY', fingerprint: 'fp1', data: [{ id: 'n1' }], total: 1, offset: 0, limit: 10, executionTimeMs: 1 });
    const got = cache.get('fp1');
    expect(got).toBeDefined();
    expect(got!.data).toHaveLength(1);
  });

  it('returns undefined for missing key', () => {
    const cache = new QueryCache();
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('evicts oldest when full', () => {
    const cache = new QueryCache();
    for (let i = 0; i < 600; i++) {
      cache.set(`fp${i}`, { queryType: 'NODE_QUERY', fingerprint: `fp${i}`, data: [], total: 0, offset: 0, limit: 10, executionTimeMs: 0 });
    }
    expect(cache.size).toBeLessThanOrEqual(500);
  });

  it('clears all entries', () => {
    const cache = new QueryCache();
    cache.set('fp1', { queryType: 'NODE_QUERY', fingerprint: 'fp1', data: [], total: 0, offset: 0, limit: 10, executionTimeMs: 0 });
    cache.clear();
    expect(cache.size).toBe(0);
  });
});
