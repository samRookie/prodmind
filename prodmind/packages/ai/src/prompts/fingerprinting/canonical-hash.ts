import { normalizeArrays, sortKeysDeep, stableStringify } from '../serialization/stable-json.ts';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input) as unknown as Uint8Array<ArrayBuffer>;
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return bytesToHex(new Uint8Array(hash));
}

export async function sha256Truncated(input: string, length = 16): Promise<string> {
  const full = await sha256(input);
  return full.slice(0, length);
}

export async function canonicalFingerprint(value: unknown): Promise<string> {
  const sorted = sortKeysDeep(value);
  const normalized = normalizeArrays(sorted);
  return sha256Truncated(stableStringify(normalized));
}
