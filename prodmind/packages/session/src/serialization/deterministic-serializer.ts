import { createHash } from 'node:crypto';
import { SerializationError } from '../errors/index.ts';

export class DeterministicSerializer {
  public serialize(data: unknown): string {
    try {
      return JSON.stringify(this.normalizeValue(data));
    } catch (cause) {
      throw new SerializationError('Failed to serialize data deterministically', { cause });
    }
  }

  public deserialize<T>(json: string): T {
    if (!json) {
      throw new SerializationError('Cannot deserialize empty string');
    }
    try {
      return JSON.parse(json) as T;
    } catch (cause) {
      throw new SerializationError('Failed to deserialize JSON', { cause });
    }
  }

  public serializeWithHashing(data: unknown): { json: string; hash: string } {
    const json = this.serialize(data);
    const hash = createHash('sha256').update(json).digest('hex');
    return { json, hash };
  }

  public compareSerialization(a: unknown, b: unknown): boolean {
    const serializedA = this.serialize(a);
    const serializedB = this.serialize(b);
    return serializedA === serializedB;
  }

  public normalize(data: unknown): unknown {
    return this.normalizeValue(data);
  }

  private normalizeValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      return this.normalizeObject(value as Record<string, unknown>);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeValue(item));
    }

    if (typeof value === 'number' && !Number.isFinite(value)) {
      return null;
    }

    return value;
  }

  private normalizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
      const value = obj[key];
      if (value !== undefined) {
        normalized[key] = this.normalizeValue(value);
      }
    }

    return normalized;
  }
}
