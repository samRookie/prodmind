import { createHash } from 'node:crypto';

export function computeHash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function computeFingerprint(parts: Record<string, unknown>): string {
  const canonical = JSON.stringify(parts, Object.keys(parts).sort());
  return computeHash(canonical);
}

export function generateId(prefix: string): string {
  const hash = computeHash(`${prefix}-${Date.now()}-${Math.random()}`);
  return `${prefix}_${hash.slice(0, 16)}`;
}

export function timestamp(): string {
  return new Date().toISOString();
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalizeScore(value: number, max: number): number {
  return max > 0 ? clamp(value / max, 0, 1) : 0;
}

export function weightedAverage(
  values: number[],
  weights: number[],
): number {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return 0;
  const weighted = values.reduce((sum, v, i) => sum + v * (weights[i] ?? 0), 0);
  return clamp(weighted / totalWeight, 0, 1);
}

export function sortBy<T>(
  items: T[],
  key: (item: T) => number,
  descending = true,
): T[] {
  return [...items].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    return descending ? kb - ka : ka - kb;
  });
}
