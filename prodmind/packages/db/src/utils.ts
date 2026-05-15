export function generateId(): string {
  const timestamp = Date.now();
  const timestampHex = timestamp.toString(16).padStart(12, '0');

  const random1 = crypto.getRandomValues(new Uint8Array(8));
  const randomHex1 = Array.from(random1)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const variant = 0x80;
  const random2 = crypto.getRandomValues(new Uint8Array(8));
  const randomHex2 = Array.from(random2)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${timestampHex.slice(0, 8)}-${timestampHex.slice(8, 12)}-7${randomHex1.slice(0, 3)}-${variant.toString(16)}${randomHex2.slice(0, 1)}-${randomHex2.slice(1, 13)}`;
}

export function now(): string {
  return new Date().toISOString();
}

export function safeJsonParse<T>(json: string | null | undefined): T | null {
  if (json === null || json === undefined) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
