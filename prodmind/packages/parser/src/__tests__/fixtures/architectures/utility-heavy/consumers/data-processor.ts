import { clamp, roundTo, isBetween } from '../utils/number-utils';
import { groupBy, uniqueBy, chunk } from '../utils/array-utils';

export interface DataPoint {
  id: string;
  category: string;
  value: number;
}

export function processData(points: DataPoint[], maxBatchSize: number): DataPoint[][] {
  const valid = points.filter((p) => isBetween(p.value, 0, 100));
  const normalized = valid.map((p) => ({ ...p, value: clamp(p.value, 0, 100) }));
  const rounded = normalized.map((p) => ({ ...p, value: roundTo(p.value, 2) }));
  const unique = uniqueBy(rounded, (p) => p.id);
  return chunk(unique, maxBatchSize);
}
