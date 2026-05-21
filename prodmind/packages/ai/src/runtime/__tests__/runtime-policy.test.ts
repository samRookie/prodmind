import { describe, expect, it } from 'vitest';

import { createRuntimeExecutionRequest, createRuntimePolicy } from '../contracts/runtime-contracts.ts';
import { RuntimePolicyEngine } from '../policies/runtime-policy.ts';

function makeRequest(overrides?: Record<string, unknown>) {
  return createRuntimeExecutionRequest({
    executionId: 'exec-1',
    provider: 'mock',
    model: 'mock-v1',
    prompt: 'hello world',
    correlationId: 'corr-1',
    ...overrides,
  });
}

describe('RuntimePolicyEngine', () => {
  it('allows valid request', () => {
    const engine = new RuntimePolicyEngine();
    const decision = engine.evaluate(makeRequest());
    expect(decision.allowed).toBe(true);
    expect(decision.reasons).toEqual([]);
  });

  it('rejects disallowed provider', () => {
    const engine = new RuntimePolicyEngine();
    const decision = engine.evaluate(makeRequest({ provider: 'openai' }));
    expect(decision.allowed).toBe(false);
    expect(decision.reasons[0]).toContain('openai');
  });

  it('rejects prompt exceeding context tokens', () => {
    const engine = new RuntimePolicyEngine({ maxContextTokens: 5 });
    const decision = engine.evaluate(makeRequest({ prompt: 'a'.repeat(10) }));
    expect(decision.allowed).toBe(false);
    expect(decision.reasons[0]).toContain('max context tokens');
  });

  it('canRetry respects policy max', () => {
    const engine = new RuntimePolicyEngine();
    const policy = createRuntimePolicy({ maxRetries: 2 });
    expect(engine.canRetry(0, policy)).toBe(true);
    expect(engine.canRetry(1, policy)).toBe(true);
    expect(engine.canRetry(2, policy)).toBe(false);
  });

  it('isProviderAllowed checks provider list', () => {
    const engine = new RuntimePolicyEngine();
    const policy = createRuntimePolicy({ allowedProviders: ['mock', 'test'] });
    expect(engine.isProviderAllowed('mock', policy)).toBe(true);
    expect(engine.isProviderAllowed('openai', policy)).toBe(false);
  });

  it('mergePolicies combines base and overrides', () => {
    const engine = new RuntimePolicyEngine();
    const base = createRuntimePolicy({ maxRetries: 2, maxTokenBudget: 1000 });
    const merged = engine.mergePolicies(base, { maxRetries: 5 });
    expect(merged.maxRetries).toBe(5);
    expect(merged.maxTokenBudget).toBe(1000);
  });

  it('getDefaultPolicy returns frozen policy', () => {
    const engine = new RuntimePolicyEngine();
    const policy = engine.getDefaultPolicy();
    expect(Object.isFrozen(policy)).toBe(true);
  });
});
