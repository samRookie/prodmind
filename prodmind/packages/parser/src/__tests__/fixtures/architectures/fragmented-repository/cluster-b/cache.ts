const store = new Map<string, { value: unknown; expiry: number }>();

export function setCache(key: string, value: unknown, ttlMs: number): void {
  store.set(key, { value, expiry: Date.now() + ttlMs });
}

export function getCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function clearCache(): void {
  store.clear();
}
