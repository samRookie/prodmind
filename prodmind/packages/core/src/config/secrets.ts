import { getEnv } from './env.ts';

const SECRET_ENV_KEYS = new Set([
  'GEMINI_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
]);

const SECRET_VALUE_PATTERNS = [
  /^sk-[A-Za-z0-9]{20,}$/,
  /^[A-Za-z0-9_-]{20,}$/,
  /^AIza[A-Za-z0-9_-]{35}$/,
];

export interface SecretAccess {
  key: string;
  accessedAt: number;
}

const accessLog: SecretAccess[] = [];

export class SecretStore {
  get(key: string): string | undefined {
    const env = getEnv();
    const value = (env as Record<string, unknown>)[key];
    if (typeof value !== 'string' || !value) return undefined;

    accessLog.push({ key, accessedAt: Date.now() });
    return value;
  }

  has(key: string): boolean {
    return SECRET_ENV_KEYS.has(key);
  }

  getAll(): Record<string, string> {
    const env = getEnv();
    const secrets: Record<string, string> = {};
    for (const key of SECRET_ENV_KEYS) {
      const value = (env as Record<string, unknown>)[key];
      if (typeof value === 'string' && value) {
        secrets[key] = value;
        accessLog.push({ key, accessedAt: Date.now() });
      }
    }
    return secrets;
  }

  mask(value: string, { prefixLen = 4, suffixLen = 4 } = {}): string {
    if (value.length <= prefixLen + suffixLen + 3) {
      return value.slice(0, prefixLen) + '...' + value.slice(-suffixLen);
    }
    return value.slice(0, prefixLen) + '*'.repeat(Math.min(value.length - prefixLen - suffixLen, 20)) + value.slice(-suffixLen);
  }

  isSecretValue(value: string): boolean {
    return SECRET_VALUE_PATTERNS.some((p) => p.test(value));
  }

  getAccessLog(): readonly SecretAccess[] {
    return accessLog;
  }

  clearAccessLog(): void {
    accessLog.length = 0;
  }

  static isSecretEnvKey(key: string): boolean {
    return SECRET_ENV_KEYS.has(key);
  }
}

export const secretStore = new SecretStore();
