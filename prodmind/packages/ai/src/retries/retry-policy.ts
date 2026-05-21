import { CancelledError,RetryableError, TerminalError } from '../errors/provider-error.ts';

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RetryPolicy {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly backoffFactor: number;
  readonly retryableStatusCodes: readonly number[];
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

export const NO_RETRY_POLICY: RetryPolicy = {
  maxRetries: 0,
  baseDelayMs: 0,
  maxDelayMs: 0,
  backoffFactor: 1,
  retryableStatusCodes: [],
};

export interface RetryMetadata {
  readonly attempt: number;
  readonly totalAttempts: number;
  readonly totalDelayMs: number;
  readonly backoffApplied: boolean;
}

function fullJitter(delayMs: number, rng: () => number): number {
  return rng() * delayMs;
}

export function calculateBackoff(attempt: number, policy: RetryPolicy, seed?: number): number {
  if (attempt <= 0) return 0;
  const rng = seed !== undefined ? mulberry32(seed + attempt) : mulberry32(Date.now() & 0x7fffffff);
  const exponential = policy.baseDelayMs * Math.pow(policy.backoffFactor, attempt - 1);
  const capped = Math.min(exponential, policy.maxDelayMs);
  return fullJitter(capped, rng);
}

export async function executeWithRetry<T>(
  fn: (attempt: number) => Promise<T>,
  policy: RetryPolicy,
  signal?: AbortSignal,
  seed?: number,
): Promise<{ data: T; retryMetadata: RetryMetadata }> {
  let lastError: Error | null = null;
  let totalDelayMs = 0;

  for (let attempt = 1; attempt <= Math.max(1, policy.maxRetries + 1); attempt++) {
    if (signal?.aborted) {
      throw new CancelledError('unknown', 'Operation cancelled', { cause: lastError ?? undefined });
    }

    try {
      const data = await fn(attempt);
      return {
        data,
        retryMetadata: {
          attempt,
          totalAttempts: attempt,
          totalDelayMs,
          backoffApplied: attempt > 1,
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (error instanceof TerminalError) {
        throw error;
      }

      if (!(error instanceof RetryableError)) {
        throw error;
      }

      if (attempt >= policy.maxRetries + 1) {
        throw error;
      }

      const delay = calculateBackoff(attempt, policy, seed);
      totalDelayMs += delay;

      await wait(delay, signal);
    }
  }

  throw lastError ?? new Error('Execution failed');
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new CancelledError('unknown', 'Operation cancelled'));
      return;
    }

    const timer = setTimeout(resolve, ms);

    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new CancelledError('unknown', 'Operation cancelled'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
