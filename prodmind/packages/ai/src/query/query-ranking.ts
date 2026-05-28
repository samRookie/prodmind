import type { QueryResult } from './query-types.ts';

export interface RankedResult<T> {
  data: T;
  score: number;
  rank: number;
}

export function rankResults<T>(results: QueryResult<T>, scoreFn: (item: T, index: number) => number): RankedResult<T>[] {
  const scored = results.data.map((item, index) => ({
    data: item,
    score: scoreFn(item, index),
    rank: 0,
  }));

  scored.sort((a, b) => {
    const scoreCmp = b.score - a.score;
    return scoreCmp !== 0 ? scoreCmp : 0;
  });

  return scored.map((item, index) => ({ ...item, rank: index + 1 }));
}
