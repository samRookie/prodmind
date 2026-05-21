function stableKeySort(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = (value as Record<string, unknown>)[key];
    }
    return sorted;
  }
  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(value, stableKeySort);
}

export function sortKeysDeep(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const key of keys) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

export function normalizeArrays(value: unknown): unknown {
  if (Array.isArray(value)) {
    const normalized = value.map(normalizeArrays);
    if (normalized.length > 0 && normalized.every((v) => typeof v !== 'object' || v === null)) {
      return [...normalized].sort((a, b) => String(a).localeCompare(String(b)));
    }
    return normalized;
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      result[key] = normalizeArrays((value as Record<string, unknown>)[key]);
    }
    return result;
  }
  return value;
}
