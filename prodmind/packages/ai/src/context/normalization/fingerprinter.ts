import { createHash } from 'node:crypto';

import type { ContextAssemblyRequest,ContextAssemblyResult } from '../contracts.ts';

const STABLE_SKIP_KEYS = new Set(['generatedAt', 'timestamp', 'fingerprint', 'id', 'chainId', 'assemblyDurationMs']);

export class ContextFingerprinter {
  fingerprint(result: ContextAssemblyResult): string {
    const stable = this.stableJson(result);
    return createHash('sha256').update(stable).digest('hex').slice(0, 16);
  }

  fingerprintRequest(request: ContextAssemblyRequest): string {
    const stable = this.stableJson(request);
    return createHash('sha256').update(stable).digest('hex').slice(0, 16);
  }

  stableJson(obj: unknown): string {
    return JSON.stringify(obj, (_key: string, value: unknown): unknown => {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        const keys = Object.keys(value as Record<string, unknown>).sort().filter((k) => !STABLE_SKIP_KEYS.has(k));
        const result: Record<string, unknown> = {};
        for (const k of keys) {
          result[k] = (value as Record<string, unknown>)[k];
        }
        return result;
      }
      if (Array.isArray(value)) {
        return value.map((item) => this.stableReplacer('', item));
      }
      return value;
    });
  }

  private stableReplacer(_key: string, value: unknown): unknown {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const keys = Object.keys(value as Record<string, unknown>).sort().filter((k) => !STABLE_SKIP_KEYS.has(k));
      const result: Record<string, unknown> = {};
      for (const k of keys) {
        result[k] = (value as Record<string, unknown>)[k];
      }
      return result;
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.stableReplacer('', item));
    }
    return value;
  }
}
