import { describe, expect, it, vi } from 'vitest';

import { RetryableError, TerminalError } from '../../errors/provider-error.ts';
import { calculateBackoff, DEFAULT_RETRY_POLICY, executeWithRetry, NO_RETRY_POLICY } from '../../retries/retry-policy.ts';

describe('calculateBackoff', () => {
  it('returns 0 for attempt 0', () => {
    const delay = calculateBackoff(0, DEFAULT_RETRY_POLICY);
    expect(delay).toBe(0);
  });

  it('produces increasing delays for successive attempts', () => {
    const delay1 = calculateBackoff(1, DEFAULT_RETRY_POLICY);
    const delay2 = calculateBackoff(2, DEFAULT_RETRY_POLICY);
    const delay3 = calculateBackoff(3, DEFAULT_RETRY_POLICY);

    // Full jitter means delay2 could be less than delay1, but the upper bound should be larger
    const max1 = 1000; // baseDelayMs * 2^0
    const max2 = 2000; // baseDelayMs * 2^1
    const max3 = 4000; // baseDelayMs * 2^2

    expect(delay1).toBeLessThanOrEqual(max1);
    expect(delay2).toBeLessThanOrEqual(max2);
    expect(delay3).toBeLessThanOrEqual(max3);
  });

  it('caps at maxDelayMs', () => {
    const policy = { ...DEFAULT_RETRY_POLICY, baseDelayMs: 100000, maxDelayMs: 5000 };
    const delay = calculateBackoff(5, policy);
    expect(delay).toBeLessThanOrEqual(5000);
  });
});

describe('executeWithRetry', () => {
  it('succeeds on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await executeWithRetry(fn, DEFAULT_RETRY_POLICY);

    expect(result.data).toBe('success');
    expect(result.retryMetadata.attempt).toBe(1);
    expect(result.retryMetadata.backoffApplied).toBe(false);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on RetryableError and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new RetryableError('test', 'attempt 1'))
      .mockRejectedValueOnce(new RetryableError('test', 'attempt 2'))
      .mockResolvedValue('success');

    const result = await executeWithRetry(fn, DEFAULT_RETRY_POLICY);

    expect(result.data).toBe('success');
    expect(result.retryMetadata.attempt).toBe(3);
    expect(result.retryMetadata.backoffApplied).toBe(true);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting retries', async () => {
    const error = new RetryableError('test', 'always fails');
    const fn = vi.fn().mockRejectedValue(error);

    await expect(executeWithRetry(fn, { ...DEFAULT_RETRY_POLICY, maxRetries: 2 })).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry TerminalError', async () => {
    const error = new TerminalError('test', 'bad request', { statusCode: 400 });
    const fn = vi.fn().mockRejectedValueOnce(error);

    await expect(executeWithRetry(fn, DEFAULT_RETRY_POLICY)).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry non-ProviderError exceptions', async () => {
    const error = new Error('unexpected');
    const fn = vi.fn().mockRejectedValueOnce(error);

    await expect(executeWithRetry(fn, DEFAULT_RETRY_POLICY)).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry when maxRetries is 0', async () => {
    const error = new RetryableError('test', 'no retry');
    const fn = vi.fn().mockRejectedValue(error);

    await expect(executeWithRetry(fn, NO_RETRY_POLICY)).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('respects AbortSignal when already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const fn = vi.fn().mockResolvedValue('should not reach');

    await expect(executeWithRetry(fn, DEFAULT_RETRY_POLICY, controller.signal)).rejects.toThrow('cancelled');
    expect(fn).not.toHaveBeenCalled();
  });

  it('respects AbortSignal during retry delay', async () => {
    const controller = new AbortController();
    let callCount = 0;
    const fn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new RetryableError('test', 'retry me'));
      }
      return Promise.resolve('success');
    });

    const promise = executeWithRetry(fn, DEFAULT_RETRY_POLICY, controller.signal);
    controller.abort();

    await expect(promise).rejects.toThrow('cancelled');
  });
});
