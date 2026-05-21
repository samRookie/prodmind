import type { ProviderRateLimitState } from '../contracts.ts';
import { createProviderRateLimitState } from '../contracts.ts';
import { ProviderRateLimitExceeded } from '../errors/provider-errors.ts';

interface BucketEntry {
  tokens: number;
  requests: number;
  windowStart: number;
}

export class ProviderRateLimiter {
  private readonly buckets: Map<string, BucketEntry> = new Map();
  private readonly tokensPerMin: number;
  private readonly requestsPerMin: number;
  private readonly windowMs: number;

  constructor(options?: { tokensPerMin?: number; requestsPerMin?: number; windowMs?: number }) {
    this.tokensPerMin = options?.tokensPerMin ?? 100000;
    this.requestsPerMin = options?.requestsPerMin ?? 1000;
    this.windowMs = options?.windowMs ?? 60000;
  }

  check(key: string): ProviderRateLimitState {
    this.evictStale();
    const entry = this.buckets.get(key);
    if (!entry) {
      return createProviderRateLimitState({
        tokensRemaining: this.tokensPerMin,
        requestsRemaining: this.requestsPerMin,
        isLimited: false,
      });
    }

    const tokensRemaining = Math.max(0, this.tokensPerMin - entry.tokens);
    const requestsRemaining = Math.max(0, this.requestsPerMin - entry.requests);

    return createProviderRateLimitState({
      tokensRemaining,
      requestsRemaining,
      resetAt: new Date(entry.windowStart + this.windowMs).toISOString(),
      isLimited: tokensRemaining === 0 || requestsRemaining === 0,
    });
  }

  consume(key: string, tokens: number = 0): ProviderRateLimitState {
    this.evictStale();
    const now = Date.now();

    let entry = this.buckets.get(key);
    if (!entry) {
      entry = { tokens: 0, requests: 0, windowStart: now };
      this.buckets.set(key, entry);
    }

    const newTokens = entry.tokens + tokens;
    const newRequests = entry.requests + 1;

    if (newTokens > this.tokensPerMin) {
      throw new ProviderRateLimitExceeded(key, `Token rate limit exceeded for "${key}"`, {
        retryAfterMs: entry.windowStart + this.windowMs - now,
      });
    }

    if (newRequests > this.requestsPerMin) {
      throw new ProviderRateLimitExceeded(key, `Request rate limit exceeded for "${key}"`, {
        retryAfterMs: entry.windowStart + this.windowMs - now,
      });
    }

    entry.tokens = newTokens;
    entry.requests = newRequests;

    return createProviderRateLimitState({
      tokensRemaining: Math.max(0, this.tokensPerMin - entry.tokens),
      requestsRemaining: Math.max(0, this.requestsPerMin - entry.requests),
      resetAt: new Date(entry.windowStart + this.windowMs).toISOString(),
      isLimited: false,
    });
  }

  reset(key?: string): void {
    if (key) {
      this.buckets.delete(key);
    } else {
      this.buckets.clear();
    }
  }

  private evictStale(): void {
    const now = Date.now();
    for (const [key, entry] of this.buckets) {
      if (now - entry.windowStart >= this.windowMs) {
        this.buckets.delete(key);
      }
    }
  }
}
