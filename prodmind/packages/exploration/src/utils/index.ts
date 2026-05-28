import { createHash, randomBytes } from 'node:crypto';

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${randomBytes(8).toString('hex')}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function computeHash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

export function computeDeterministicHash(data: Record<string, unknown>): string {
  const canonical = JSON.stringify(data, Object.keys(data).sort());
  return computeHash(canonical);
}

export function minBy<T>(arr: T[], fn: (item: T) => number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr.reduce((best, curr) => (fn(curr) < fn(best) ? curr : best));
}

export function maxBy<T>(arr: T[], fn: (item: T) => number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr.reduce((best, curr) => (fn(curr) > fn(best) ? curr : best));
}

export function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function deduplicate<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function stableSort<T>(arr: T[], comparator: (a: T, b: T) => number): T[] {
  return [...arr].sort(comparator);
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export function intersection<T>(a: T[], b: T[]): T[] {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

export function union<T>(a: T[], b: T[]): T[] {
  return deduplicate([...a, ...b]);
}

export function difference<T>(a: T[], b: T[]): T[] {
  const setB = new Set(b);
  return a.filter((x) => !setB.has(x));
}

export function generateFingerprint(parts: string[]): string {
  const sorted = [...parts].sort();
  return computeHash(sorted.join('|'));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
