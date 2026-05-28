import { computeHash } from '../utils/index.ts';

export class Canonicalization {
  public static canonicalize(obj: Record<string, unknown>): Record<string, unknown> {
    return Canonicalization.sortObjectKeys(obj);
  }

  public static canonicalJson(obj: Record<string, unknown>): string {
    return Canonicalization.stableStringify(Canonicalization.canonicalize(obj));
  }

  public static stableStringify(obj: unknown): string {
    if (obj === null || obj === undefined) {
      return 'null';
    }
    if (typeof obj === 'string') {
      return JSON.stringify(obj);
    }
    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj);
    }
    if (Array.isArray(obj)) {
      const items = obj.map((item) => Canonicalization.stableStringify(item));
      return `[${items.join(',')}]`;
    }
    if (typeof obj === 'object') {
      const keys = Object.keys(obj as Record<string, unknown>).sort();
      const pairs = keys.map(
        (k) =>
          `${JSON.stringify(k)}:${Canonicalization.stableStringify((obj as Record<string, unknown>)[k])}`,
      );
      return `{${pairs.join(',')}}`;
    }
    return String(obj);
  }

  public static sortObjectKeys<T extends Record<string, unknown>>(obj: T): T {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      const val = obj[key];
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        sorted[key] = Canonicalization.sortObjectKeys(val as Record<string, unknown>);
      } else if (Array.isArray(val)) {
        sorted[key] = val.map((item) => {
          if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            return Canonicalization.sortObjectKeys(item as Record<string, unknown>);
          }
          return item;
        });
      } else {
        sorted[key] = val;
      }
    }
    return sorted as T;
  }

  public static deterministicHash(obj: Record<string, unknown>): string {
    const canonical = Canonicalization.canonicalJson(obj);
    return computeHash(canonical);
  }
}
