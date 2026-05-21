import { describe, expect, it } from 'vitest';

import {
  createRuntimeBudget,
  createRuntimeExecutionRequest,
  createRuntimeFailureRecord,
  createRuntimeLifecycleEntry,
  createRuntimePolicy,
  RUNTIME_LIFECYCLE_STAGES,
} from '../contracts/runtime-contracts.ts';

describe('createRuntimePolicy', () => {
  it('creates with defaults when no overrides', () => {
    const policy = createRuntimePolicy({});
    expect(policy.maxExecutionDurationMs).toBe(60000);
    expect(policy.maxRetries).toBe(3);
    expect(policy.allowedProviders).toEqual(['mock']);
    expect(policy.maxTokenBudget).toBe(100000);
    expect(policy.maxContextTokens).toBe(32000);
    expect(policy.enforceReplay).toBe(false);
    expect(policy.concurrencyLimit).toBe(10);
    expect(policy.isolationLevel).toBe('logical');
  });

  it('merges overrides with defaults', () => {
    const policy = createRuntimePolicy({ maxRetries: 5, maxTokenBudget: 50000 });
    expect(policy.maxRetries).toBe(5);
    expect(policy.maxTokenBudget).toBe(50000);
    expect(policy.maxExecutionDurationMs).toBe(60000);
  });

  it('returns frozen object', () => {
    const policy = createRuntimePolicy({});
    expect(Object.isFrozen(policy)).toBe(true);
    expect(Object.isFrozen(policy.allowedProviders)).toBe(true);
  });
});

describe('createRuntimeExecutionRequest', () => {
  it('creates request with all fields', () => {
    const req = createRuntimeExecutionRequest({
      executionId: 'exec-1',
      provider: 'mock',
      model: 'mock-v1',
      prompt: 'test prompt',
      systemPrompt: 'system',
      metadata: { env: 'test' },
      correlationId: 'corr-1',
    });
    expect(req.executionId).toBe('exec-1');
    expect(req.provider).toBe('mock');
    expect(req.model).toBe('mock-v1');
    expect(req.metadata).toEqual({ env: 'test' });
    expect(Object.isFrozen(req)).toBe(true);
  });
});

describe('createRuntimeBudget', () => {
  it('calculates over budget correctly', () => {
    const budget = createRuntimeBudget({ promptTokens: 60000, contextTokens: 50000, totalBudget: 100000 });
    expect(budget.isOverBudget).toBe(true);
    expect(budget.remaining).toBeLessThan(0);
  });

  it('calculates under budget correctly', () => {
    const budget = createRuntimeBudget({ promptTokens: 1000, contextTokens: 500, totalBudget: 10000 });
    expect(budget.isOverBudget).toBe(false);
    expect(budget.remaining).toBe(8500);
  });

  it('applies retry amplification', () => {
    const budget = createRuntimeBudget({ promptTokens: 1000, contextTokens: 500, totalBudget: 10000, retryAmplification: 2 });
    expect(budget.retryAmplification).toBe(2);
    expect(budget.estimatedLoad).toBe(1500);
  });
});

describe('createRuntimeLifecycleEntry', () => {
  it('creates entry with timestamp and frozen metadata', () => {
    const entry = createRuntimeLifecycleEntry({ stage: 'CREATED', durationMs: 0 });
    expect(entry.stage).toBe('CREATED');
    expect(entry.durationMs).toBe(0);
    expect(typeof entry.timestamp).toBe('string');
    expect(Object.isFrozen(entry.metadata)).toBe(true);
  });
});

describe('createRuntimeFailureRecord', () => {
  it('creates non-recoverable failure by default', () => {
    const record = createRuntimeFailureRecord({ failureClass: 'timeout', message: 'timed out', stage: 'EXECUTING', code: 'T1' });
    expect(record.recoverable).toBe(false);
  });

  it('marks recoverable when specified', () => {
    const record = createRuntimeFailureRecord({ failureClass: 'timeout', message: 'retry', stage: 'EXECUTING', code: 'T2', recoverable: true });
    expect(record.recoverable).toBe(true);
  });
});

describe('RUNTIME_LIFECYCLE_STAGES', () => {
  it('contains all 12 stages', () => {
    expect(RUNTIME_LIFECYCLE_STAGES).toHaveLength(12);
    expect(RUNTIME_LIFECYCLE_STAGES).toContain('CREATED');
    expect(RUNTIME_LIFECYCLE_STAGES).toContain('CANCELLED');
  });

  it('is frozen', () => {
    expect(Object.isFrozen(RUNTIME_LIFECYCLE_STAGES)).toBe(true);
  });
});
