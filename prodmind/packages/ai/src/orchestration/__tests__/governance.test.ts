import { describe, expect, it } from 'vitest';

import { createExecutionEdge,createExecutionGraph, createExecutionNode } from '../contracts/index.ts';
import { BudgetGovernance } from '../governance/budget-governance.ts';
import { ConcurrencyGovernance } from '../governance/concurrency-governance.ts';
import { ExecutionLimits } from '../governance/execution-limits.ts';
import { FailureClassifier } from '../governance/failure-classifier.ts';

// ---------------------------------------------------------------------------
// ExecutionLimits
// ---------------------------------------------------------------------------
describe('ExecutionLimits', () => {
  it('allows a valid graph', () => {
    const limits = new ExecutionLimits();
    const graph = createExecutionGraph({
      nodes: [createExecutionNode({ id: 'a', type: 'prompt', label: 'A' })],
    });
    expect(limits.checkGraph(graph).allowed).toBe(true);
  });

  it('rejects graph exceeding maxNodes', () => {
    const limits = new ExecutionLimits({ maxNodes: 2 });
    const graph = createExecutionGraph({
      nodes: [
        createExecutionNode({ id: 'a', type: 'prompt', label: 'A' }),
        createExecutionNode({ id: 'b', type: 'prompt', label: 'B' }),
        createExecutionNode({ id: 'c', type: 'prompt', label: 'C' }),
      ],
    });
    const result = limits.checkGraph(graph);
    expect(result.allowed).toBe(false);
    expect(result.reasons.some(r => r.includes('nodes'))).toBe(true);
  });

  it('rejects graph exceeding maxDepth', () => {
    const limits = new ExecutionLimits({ maxDepth: 2 });
    const graph = createExecutionGraph({
      nodes: [
        createExecutionNode({ id: 'a', type: 'prompt', label: 'A' }),
        createExecutionNode({ id: 'b', type: 'transform', label: 'B', dependencies: ['a'] }),
        createExecutionNode({ id: 'c', type: 'transform', label: 'C', dependencies: ['b'] }),
        createExecutionNode({ id: 'd', type: 'transform', label: 'D', dependencies: ['c'] }),
      ],
    });
    const result = limits.checkGraph(graph);
    expect(result.allowed).toBe(false);
    expect(result.reasons.some(r => r.includes('depth'))).toBe(true);
  });

  it('rejects graph exceeding maxFanout', () => {
    const limits = new ExecutionLimits({ maxFanout: 2 });
    const graph = createExecutionGraph({
      nodes: [
        createExecutionNode({ id: 'a', type: 'prompt', label: 'A' }),
        createExecutionNode({ id: 'b', type: 'prompt', label: 'B' }),
        createExecutionNode({ id: 'c', type: 'prompt', label: 'C' }),
        createExecutionNode({ id: 'd', type: 'prompt', label: 'D' }),
      ],
      edges: [
        createExecutionEdge({ source: 'a', target: 'b' }),
        createExecutionEdge({ source: 'a', target: 'c' }),
        createExecutionEdge({ source: 'a', target: 'd' }),
      ],
    });
    const result = limits.checkGraph(graph);
    expect(result.allowed).toBe(false);
    expect(result.reasons.some(r => r.includes('fanout'))).toBe(true);
  });

  it('uses default values when no config provided', () => {
    const limits = new ExecutionLimits();
    expect(limits.maxNodes).toBe(100);
    expect(limits.maxDepth).toBe(20);
    expect(limits.maxFanout).toBe(10);
    expect(limits.nodeTimeoutMs).toBe(30000);
  });

  it('returns frozen result', () => {
    const limits = new ExecutionLimits();
    const result = limits.checkGraph(createExecutionGraph({ nodes: [createExecutionNode({ id: 'a', type: 'prompt', label: 'A' })] }));
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.reasons)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// BudgetGovernance
// ---------------------------------------------------------------------------
describe('BudgetGovernance', () => {
  it('allows execution within budget', () => {
    const budget = new BudgetGovernance({ maxTotalNodes: 10, maxTotalTimeMs: 10000 });
    expect(budget.allowExecution()).toBe(true);
  });

  it('records node completion and deducts budget', () => {
    const budget = new BudgetGovernance({ maxTotalNodes: 2, maxTotalTimeMs: 1000 });
    budget.recordNodeComplete(100);
    const state = budget.getState();
    expect(state.remainingNodes).toBe(1);
    expect(state.remainingTimeMs).toBe(900);
    expect(state.usedNodes).toBe(1);
  });

  it('exhausts when nodes run out', () => {
    const budget = new BudgetGovernance({ maxTotalNodes: 1, maxTotalTimeMs: 10000 });
    budget.recordNodeComplete(100);
    expect(budget.allowExecution()).toBe(false);
    expect(budget.getState().exhausted).toBe(true);
  });

  it('exhausts when time runs out', () => {
    const budget = new BudgetGovernance({ maxTotalNodes: 100, maxTotalTimeMs: 500 });
    budget.recordNodeComplete(600);
    expect(budget.allowExecution()).toBe(false);
    expect(budget.getState().exhausted).toBe(true);
  });

  it('resets budget', () => {
    const budget = new BudgetGovernance({ maxTotalNodes: 1 });
    budget.recordNodeComplete(100);
    budget.reset();
    expect(budget.getState().usedNodes).toBe(0);
    expect(budget.allowExecution()).toBe(true);
  });

  it('returns frozen state', () => {
    const budget = new BudgetGovernance();
    expect(Object.isFrozen(budget.getState())).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ConcurrencyGovernance
// ---------------------------------------------------------------------------
describe('ConcurrencyGovernance', () => {
  it('allows acquiring up to max', () => {
    const cg = new ConcurrencyGovernance(2);
    expect(cg.tryAcquire()).toBe(true);
    expect(cg.tryAcquire()).toBe(true);
    expect(cg.tryAcquire()).toBe(false);
    expect(cg.getActive()).toBe(2);
  });

  it('releases decrements active count', () => {
    const cg = new ConcurrencyGovernance(2);
    cg.tryAcquire();
    cg.tryAcquire();
    cg.release();
    expect(cg.getActive()).toBe(1);
    expect(cg.tryAcquire()).toBe(true);
  });

  it('hasCapacity returns true when under limit', () => {
    const cg = new ConcurrencyGovernance(1);
    expect(cg.hasCapacity()).toBe(true);
    cg.tryAcquire();
    expect(cg.hasCapacity()).toBe(false);
  });

  it('getAvailable returns remaining capacity', () => {
    const cg = new ConcurrencyGovernance(5);
    cg.tryAcquire();
    cg.tryAcquire();
    expect(cg.getAvailable()).toBe(3);
  });

  it('reset clears active count', () => {
    const cg = new ConcurrencyGovernance(1);
    cg.tryAcquire();
    cg.reset();
    expect(cg.getActive()).toBe(0);
  });

  it('release does not go below zero', () => {
    const cg = new ConcurrencyGovernance(1);
    cg.release();
    cg.release();
    expect(cg.getActive()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// FailureClassifier
// ---------------------------------------------------------------------------
describe('FailureClassifier', () => {
  const classifier = new FailureClassifier();

  it('classifies rate limit as transient retryable', () => {
    const result = classifier.classify(new Error('rate limit exceeded'));
    expect(result.retryable).toBe(true);
    expect(result.category).toBe('transient');
  });

  it('classifies timeout as transient retryable', () => {
    const result = classifier.classify(new Error('request timed out'));
    expect(result.retryable).toBe(true);
    expect(result.category).toBe('transient');
  });

  it('classifies auth error as permanent fatal', () => {
    const result = classifier.classify(new Error('invalid api key'));
    expect(result.retryable).toBe(false);
    expect(result.category).toBe('permanent');
    expect(result.severity).toBe('fatal');
  });

  it('classifies server error as transient retryable', () => {
    const result = classifier.classify(new Error('500 internal server error'));
    expect(result.retryable).toBe(true);
    expect(result.category).toBe('transient');
  });

  it('classifies unknown error as unknown fatal', () => {
    const result = classifier.classify(new Error('some random error'));
    expect(result.retryable).toBe(false);
    expect(result.category).toBe('unknown');
  });

  it('supports custom rules', () => {
    const custom = new FailureClassifier();
    custom.addRule(err => {
      if (err.message.includes('custom')) {
        return Object.freeze({ category: 'transient' as const, severity: 'retryable' as const, retryable: true, reason: 'custom' });
      }
      return null;
    });
    const result = custom.classify(new Error('custom error'));
    expect(result.retryable).toBe(true);
    expect(result.reason).toBe('custom');
  });

  it('returns frozen classification', () => {
    const result = classifier.classify(new Error('test'));
    expect(Object.isFrozen(result)).toBe(true);
  });
});
