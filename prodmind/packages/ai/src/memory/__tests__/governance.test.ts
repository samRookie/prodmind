import { describe, expect, it } from 'vitest';

import { createMemoryRecord } from '../contracts/memory-factories.ts';
import { MemoryBudget } from '../governance/memory-budget.ts';
import { MemoryGovernor } from '../governance/memory-governor.ts';
import { RetentionPolicy } from '../governance/retention-policy.ts';

/* ------------------------------------------------------------------ */
/*  RetentionPolicy                                                     */
/* ------------------------------------------------------------------ */
describe('RetentionPolicy', () => {
  it('starts with no rules', () => {
    const p = new RetentionPolicy();
    expect(p.ruleCount()).toBe(0);
    expect(p.rules).toEqual([]);
  });

  it('adds and retrieves rules', () => {
    const p = new RetentionPolicy();
    p.addRule({ category: 'execution', maxRecords: 100, ttlMs: 86_400_000 });
    const rule = p.getRule('execution');
    expect(rule?.maxRecords).toBe(100);
    expect(p.ruleCount()).toBe(1);
  });

  it('removes rules', () => {
    const p = new RetentionPolicy();
    p.addRule({ category: 'execution', maxRecords: 50, ttlMs: 1000 });
    p.removeRule('execution');
    expect(p.getRule('execution')).toBeUndefined();
  });

  it('clears all rules', () => {
    const p = new RetentionPolicy();
    p.addRule({ category: 'a', maxRecords: 1, ttlMs: 1 });
    p.addRule({ category: 'b', maxRecords: 1, ttlMs: 1 });
    p.clear();
    expect(p.ruleCount()).toBe(0);
  });

  it('returns undefined for missing rule', () => {
    const p = new RetentionPolicy();
    expect(p.getRule('nope')).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  MemoryBudget                                                        */
/* ------------------------------------------------------------------ */
describe('MemoryBudget', () => {
  it('starts with no allocations', () => {
    const b = new MemoryBudget();
    expect(b.allocations).toEqual([]);
  });

  it('allocates budget per category', () => {
    const b = new MemoryBudget();
    b.allocate('execution', 5000, 50);
    const alloc = b.getAllocation('execution');
    expect(alloc?.maxTokens).toBe(5000);
    expect(alloc?.maxRecords).toBe(50);
    expect(alloc?.currentTokens).toBe(0);
  });

  it('tracks usage', () => {
    const b = new MemoryBudget();
    b.allocate('execution', 1000, 10);
    b.track('execution', 200, 3);
    const alloc = b.getAllocation('execution')!;
    expect(alloc.currentTokens).toBe(200);
    expect(alloc.currentRecords).toBe(3);
  });

  it('validates budget', () => {
    const b = new MemoryBudget();
    b.allocate('execution', 100, 5);
    expect(b.isWithinBudget('execution', 50, 2)).toBe(true);
    expect(b.isWithinBudget('execution', 101, 0)).toBe(false);
    expect(b.isWithinBudget('execution', 0, 6)).toBe(false);
  });

  it('returns false for unallocated categories', () => {
    const b = new MemoryBudget();
    expect(b.isWithinBudget('unknown')).toBe(false);
  });

  it('resets a category', () => {
    const b = new MemoryBudget();
    b.allocate('execution', 100, 10);
    b.track('execution', 50, 5);
    b.reset('execution');
    expect(b.getAllocation('execution')?.currentTokens).toBe(0);
  });

  it('deallocates a category', () => {
    const b = new MemoryBudget();
    b.allocate('execution', 100, 10);
    b.deallocate('execution');
    expect(b.getAllocation('execution')).toBeUndefined();
  });

  it('clears all', () => {
    const b = new MemoryBudget();
    b.allocate('a', 100, 10);
    b.allocate('b', 100, 10);
    b.clear();
    expect(b.allocations).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/*  MemoryGovernor                                                       */
/* ------------------------------------------------------------------ */
describe('MemoryGovernor', () => {
  it('creates governor with empty policies', () => {
    const g = new MemoryGovernor();
    expect(g.retentionPolicy.ruleCount()).toBe(0);
    expect(g.budget.allocations).toHaveLength(0);
  });

  it('configures default rules', () => {
    const g = new MemoryGovernor();
    g.configureDefaultRules();
    expect(g.retentionPolicy.ruleCount()).toBe(3);
    expect(g.retentionPolicy.getRule('execution')).toBeDefined();
    expect(g.retentionPolicy.getRule('session')).toBeDefined();
    expect(g.retentionPolicy.getRule('metrics')).toBeDefined();
  });

  it('configures default budget', () => {
    const g = new MemoryGovernor();
    g.configureDefaultBudget();
    expect(g.budget.allocations).toHaveLength(3);
  });

  it('enforces retention rules', () => {
    const g = new MemoryGovernor();
    g.retentionPolicy.addRule({ category: 'execution', maxRecords: 2, ttlMs: 1000 });

    const records = [
      createMemoryRecord({ category: 'execution' }),
      createMemoryRecord({ category: 'execution' }),
      createMemoryRecord({ category: 'execution' }),
    ];
    const result = g.enforceRetention(records);
    expect(result.removedRecords).toBe(1);
  });

  it('enforceRetention is noop when no rule matches', () => {
    const g = new MemoryGovernor();
    const records = [createMemoryRecord({ category: 'execution' })];
    const result = g.enforceRetention(records);
    expect(result.removedRecords).toBe(0);
  });

  it('enforceBudget detects violations', () => {
    const g = new MemoryGovernor();
    g.budget.allocate('execution', 100, 5);
    g.budget.track('execution', 200, 10);
    const result = g.enforceBudget();
    expect(result.violations).toBe(1);
  });

  it('enforceBudget returns 0 violations when within budget', () => {
    const g = new MemoryGovernor();
    g.budget.allocate('execution', 1000, 50);
    g.budget.track('execution', 100, 5);
    const result = g.enforceBudget();
    expect(result.violations).toBe(0);
  });

  it('creates governor without store', () => {
    const g = new MemoryGovernor();
    expect(g).toBeDefined();
  });
});
