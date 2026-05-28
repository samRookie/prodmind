import { describe, it, expect } from 'vitest';
import { buildTrendIndex } from '../../indexing/trend-index.ts';
import type { IndexBuildInput } from '../../indexing/indexing-types.ts';

describe('TrendIndex', () => {
  it('builds index from trends', () => {
    const input: IndexBuildInput = {
      trends: [{ trendType: 'COMPLEXITY', direction: 'INCREASING', fingerprint: 'fp1' }],
    };
    const index = buildTrendIndex(input);
    expect(index.entries).toHaveLength(1);
    expect(index.fingerprint).toBeTruthy();
  });

  it('handles empty input', () => {
    const index = buildTrendIndex({});
    expect(index.entries).toHaveLength(0);
  });
});
