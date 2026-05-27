import { createHash } from 'node:crypto';

export function computeFingerprint(input: string, algorithm = 'sha256'): string {
  return createHash(algorithm).update(input, 'utf8').digest('hex');
}

export function computeMemoryFingerprint(parts: readonly string[]): string {
  const canonical = parts.join('|');
  return computeFingerprint(canonical);
}

export function computeEntryFingerprint(category: string, content: string, timestamp: string): string {
  return computeMemoryFingerprint([category, content, timestamp]);
}

export function computeChainFingerprint(chainType: string, nodeIds: readonly string[]): string {
  return computeMemoryFingerprint([chainType, ...[...nodeIds].sort()]);
}

export function computeContextFingerprint(entryIds: readonly string[], budget: number): string {
  return computeMemoryFingerprint([budget.toString(), ...[...entryIds].sort()]);
}

export function fingerprintsEqual(a: string, b: string): boolean {
  return a.length === b.length && a === b;
}
