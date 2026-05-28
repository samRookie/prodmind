import { createHash } from 'node:crypto';
import { SerializationError } from '../errors/index.ts';

export class CanonicalizationEngine {
  public toCanonicalForm(data: unknown): string {
    try {
      const normalized = this.normalizeKeys(data);
      return JSON.stringify(normalized);
    } catch (cause) {
      throw new SerializationError('Failed to convert to canonical form', { cause });
    }
  }

  public fromCanonicalForm<T>(canonical: string): T {
    if (!canonical) {
      throw new SerializationError('Cannot restore from empty canonical form');
    }
    try {
      return JSON.parse(canonical) as T;
    } catch (cause) {
      throw new SerializationError('Failed to restore from canonical form', { cause });
    }
  }

  public canonicalHash(data: unknown): string {
    const canonical = this.toCanonicalForm(data);
    return createHash('sha256').update(canonical).digest('hex');
  }

  public canonicalEquals(a: unknown, b: unknown): boolean {
    const canonicalA = this.toCanonicalForm(a);
    const canonicalB = this.toCanonicalForm(b);
    return canonicalA === canonicalB;
  }

  public normalizeKeys(data: unknown): unknown {
    if (data === null || data === undefined) {
      return null;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.normalizeKeys(item));
    }

    if (typeof data === 'object' && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;
      const normalized: Record<string, unknown> = {};
      const keys = Object.keys(obj).sort();

      for (const key of keys) {
        const value = obj[key];
        if (value !== undefined) {
          normalized[key] = this.normalizeKeys(value);
        }
      }

      return normalized;
    }

    if (typeof data === 'number') {
      if (Number.isNaN(data)) return null;
      if (!Number.isFinite(data)) return null;
      return data;
    }

    return data;
  }
}
