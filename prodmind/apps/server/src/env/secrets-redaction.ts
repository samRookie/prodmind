const SENSITIVE_KEYS = new Set([
  'AI_API_KEY',
  'AI_SECRET',
  'DB_PASSWORD',
  'API_KEY',
  'SECRET',
  'TOKEN',
  'PASSWORD',
  'AUTH',
  'PRIVATE_KEY',
]);

export function isSensitiveKey(key: string): boolean {
  const upper = key.toUpperCase();
  for (const sk of SENSITIVE_KEYS) {
    if (upper.includes(sk)) return true;
  }
  return false;
}

export function redactValue(value: string): string {
  if (value.length <= 8) return '****';
  return value.slice(0, 4) + '****' + value.slice(-4);
}

export function redactEnv(env: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(env)) {
    if (isSensitiveKey(key) && typeof value === 'string') {
      result[key] = redactValue(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function maskSensitiveValue(value: string): string {
  if (value.length <= 4) return '****';
  return value.slice(0, 2) + '*'.repeat(value.length - 4) + value.slice(-2);
}
