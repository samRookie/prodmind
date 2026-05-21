import { describe, expect, it } from 'vitest';

import { createRuntimeFailureRecord,createRuntimePolicy } from '../contracts/runtime-contracts.ts';
import { RuntimeRetryGovernance } from '../retries/runtime-retry.ts';

describe('RuntimeRetryGovernance', () => {
  it('canRetry allows retries within limits for recoverable failures', () => {
    const gov = new RuntimeRetryGovernance();
    const policy = createRuntimePolicy({ maxRetries: 3 });
    const failure = createRuntimeFailureRecord({ failureClass: 'timeout', message: 'timeout', stage: 'EXECUTING', code: 'T1', recoverable: true });
    expect(gov.canRetry(0, failure, policy)).toBe(true);
    expect(gov.canRetry(1, failure, policy)).toBe(true);
    expect(gov.canRetry(2, failure, policy)).toBe(true);
    expect(gov.canRetry(3, failure, policy)).toBe(false);
  });

  it('cannot retry non-recoverable failures', () => {
    const gov = new RuntimeRetryGovernance();
    const policy = createRuntimePolicy({ maxRetries: 3 });
    const failure = createRuntimeFailureRecord({ failureClass: 'governance_rejection', message: 'denied', stage: 'VALIDATED', code: 'G1', recoverable: false });
    expect(gov.canRetry(0, failure, policy)).toBe(false);
  });

  it('computeDelay produces exponential backoff', () => {
    const gov = new RuntimeRetryGovernance({ baseDelayMs: 1000, maxDelayMs: 30000 });
    const d1 = gov.computeDelay(1);
    const d2 = gov.computeDelay(2);
    const d3 = gov.computeDelay(3);
    expect(d1).toBeGreaterThanOrEqual(0);
    expect(d2).toBeGreaterThanOrEqual(d1);
    expect(d3).toBeGreaterThanOrEqual(d2);
    expect(d3).toBeLessThanOrEqual(24000);
  });

  it('computeDelay caps at maxDelayMs', () => {
    const gov = new RuntimeRetryGovernance({ baseDelayMs: 100000, maxDelayMs: 5000 });
    const delay = gov.computeDelay(5);
    expect(delay).toBeLessThanOrEqual(5000);
  });

  it('getTrace returns accumulated failure info', () => {
    const gov = new RuntimeRetryGovernance();
    const policy = createRuntimePolicy({ maxRetries: 3 });
    const failure = createRuntimeFailureRecord({ failureClass: 'timeout', message: 't', stage: 'EXECUTING', code: 'T1', recoverable: true });
    gov.canRetry(0, failure, policy);
    gov.canRetry(1, failure, policy);
    const trace = gov.getTrace();
    expect(trace.attempts).toBe(2);
    expect(trace.maxAttempts).toBe(3);
    expect(trace.failureHistory).toHaveLength(2);
  });

  it('reset clears history', () => {
    const gov = new RuntimeRetryGovernance();
    const policy = createRuntimePolicy({ maxRetries: 3 });
    const failure = createRuntimeFailureRecord({ failureClass: 'timeout', message: 't', stage: 'EXECUTING', code: 'T1', recoverable: true });
    gov.canRetry(0, failure, policy);
    expect(gov.getTrace().attempts).toBe(1);
    gov.reset();
    expect(gov.getTrace().attempts).toBe(0);
  });
});
