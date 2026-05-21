import { describe, expect, it } from 'vitest';

import { RuntimeBudgetTracker } from '../budgeting/runtime-budget.ts';
import { createRuntimeExecutionRequest,createRuntimePolicy } from '../contracts/runtime-contracts.ts';

function makeRequest(prompt = 'hello') {
  return createRuntimeExecutionRequest({
    executionId: 'exec-1',
    provider: 'mock',
    model: 'mock-v1',
    prompt,
    correlationId: 'corr-1',
  });
}

describe('RuntimeBudgetTracker', () => {
  it('estimates token usage from prompt length', () => {
    const policy = createRuntimePolicy({ maxTokenBudget: 10000 });
    const tracker = new RuntimeBudgetTracker(policy);
    const request = makeRequest('a'.repeat(40));
    const budget = tracker.estimate(request);
    expect(budget.promptTokens).toBeGreaterThan(0);
    expect(budget.promptTokens).toBe(10);
    expect(budget.totalBudget).toBe(10000);
  });

  it('consumes budget and tracks remaining', () => {
    const policy = createRuntimePolicy({ maxTokenBudget: 1000 });
    const tracker = new RuntimeBudgetTracker(policy);
    const request = makeRequest();
    const budget = tracker.estimate(request);
    expect(tracker.consume(budget)).toBe(true);
    expect(tracker.getUsed()).toBeGreaterThan(0);
    expect(tracker.getRemaining()).toBeLessThan(1000);
  });

  it('prevents over-budget consumption', () => {
    const policy = createRuntimePolicy({ maxTokenBudget: 10 });
    const tracker = new RuntimeBudgetTracker(policy);
    expect(tracker.consume({ promptTokens: 100, contextTokens: 0, estimatedLoad: 100, retryAmplification: 1, totalBudget: 10, remaining: -90, isOverBudget: true })).toBe(false);
  });

  it('getUtilization returns 0 for no consumption', () => {
    const policy = createRuntimePolicy({ maxTokenBudget: 1000 });
    const tracker = new RuntimeBudgetTracker(policy);
    expect(tracker.getUtilization()).toBe(0);
  });

  it('reset clears state', () => {
    const policy = createRuntimePolicy({ maxTokenBudget: 1000 });
    const tracker = new RuntimeBudgetTracker(policy);
    const request = makeRequest();
    tracker.consume(tracker.estimate(request));
    expect(tracker.getUsed()).toBeGreaterThan(0);
    tracker.reset();
    expect(tracker.getUsed()).toBe(0);
  });

  it('returns 0 utilization when budget limit is 0', () => {
    const policy = createRuntimePolicy({ maxTokenBudget: 0 });
    const tracker = new RuntimeBudgetTracker(policy);
    expect(tracker.getUtilization()).toBe(0);
  });
});
