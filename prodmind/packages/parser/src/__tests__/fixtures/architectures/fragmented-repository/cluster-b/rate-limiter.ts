import { getCache, setCache } from './cache';

export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(clientId: string): boolean {
    const key = `ratelimit:${clientId}`;
    const count = getCache<number>(key) ?? 0;
    if (count >= this.maxRequests) return false;
    setCache(key, count + 1, this.windowMs);
    return true;
  }
}
