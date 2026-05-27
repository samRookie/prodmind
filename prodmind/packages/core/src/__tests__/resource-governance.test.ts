import { describe, expect, it } from 'vitest';
import { ResourceBudgetManager } from '../resource-governance/budget-manager';
import { DeterministicGarbageCollector } from '../resource-governance/garbage-collector';
import { MemoryPressureDetector } from '../resource-governance/memory-pressure';
import { ResourceQuotaPolicy } from '../resource-governance/quota-policy';

describe('ResourceBudgetManager', () => {
  it('tracks allocations correctly', () => {
    const mgr = new ResourceBudgetManager({ maxHeapMB: 1 });
    const usage = mgr.getUsage('heap');
    expect(usage.allocated).toBe(0);
    expect(usage.peak).toBe(0);
    expect(usage.limit).toBe(1048576);

    mgr.trackAllocation('heap', 500000);
    const after = mgr.getUsage('heap');
    expect(after.allocated).toBe(500000);
    expect(after.peak).toBe(500000);
  });

  it('rejects allocation over limit', () => {
    const mgr = new ResourceBudgetManager({ maxHeapMB: 1 });
    const ok = mgr.trackAllocation('heap', 2 * 1024 * 1024);
    expect(ok).toBe(false);
  });

  it('tracks peak correctly', () => {
    const mgr = new ResourceBudgetManager({ maxHeapMB: 10 });
    mgr.trackAllocation('heap', 1000);
    mgr.trackAllocation('heap', 2000);
    mgr.trackDeallocation('heap', 500);
    const usage = mgr.getUsage('heap');
    expect(usage.peak).toBe(3000);
    expect(usage.allocated).toBe(2500);
  });

  it('resets all state', () => {
    const mgr = new ResourceBudgetManager({ maxHeapMB: 10 });
    mgr.trackAllocation('heap', 5000);
    mgr.reset();
    const usage = mgr.getUsage('heap');
    expect(usage.allocated).toBe(0);
    expect(usage.peak).toBe(0);
  });

  it('resets single category', () => {
    const mgr = new ResourceBudgetManager({ maxHeapMB: 10 });
    mgr.trackAllocation('heap', 5000);
    mgr.trackAllocation('graph', 3000);
    mgr.resetCategory('heap');
    expect(mgr.getUsage('heap').allocated).toBe(0);
    expect(mgr.getUsage('graph').allocated).toBe(3000);
  });

  it('returns frozen objects from getUsage', () => {
    const mgr = new ResourceBudgetManager({ maxHeapMB: 10 });
    const usage = mgr.getUsage('heap');
    expect(() => { (usage as any).allocated = 999; }).toThrow();
  });

  it('returns frozen objects from getAllUsage', () => {
    const mgr = new ResourceBudgetManager({ maxHeapMB: 10 });
    const all = mgr.getAllUsage();
    expect(() => { (all as any).heap = null; }).toThrow();
    expect(() => { (all.heap as any).allocated = 999; }).toThrow();
  });

  it('getTotalUsage returns correct totals', () => {
    const mgr = new ResourceBudgetManager({ maxHeapMB: 1, maxGraphMemoryMB: 1 });
    mgr.trackAllocation('heap', 500000);
    mgr.trackAllocation('graph', 250000);
    const total = mgr.getTotalUsage();
    expect(total.allocated).toBe(750000);
    expect(total.peak).toBe(750000);
  });
});

describe('DeterministicGarbageCollector', () => {
  it('cleans up old replay entries', () => {
    const gc = new DeterministicGarbageCollector();
    const count = gc.cleanupReplay(5000);
    expect(count).toBe(5);
    expect(gc.getTotalCleaned()).toBe(5);
    expect(gc.getRunCount()).toBe(1);
    expect(gc.getLastRun()).toBe(1);
  });

  it('handles multiple cleanup types', () => {
    const gc = new DeterministicGarbageCollector();
    gc.cleanupReplay(3000);
    gc.pruneTelemetry(7000);
    gc.cleanupStaleExecutions(2000);
    expect(gc.getTotalCleaned()).toBe(3 + 7 + 2);
    expect(gc.getRunCount()).toBe(3);
  });

  it('prunes telemetry correctly', () => {
    const gc = new DeterministicGarbageCollector();
    const count = gc.pruneTelemetry(10000);
    expect(count).toBe(10);
  });

  it('cleans up stale executions', () => {
    const gc = new DeterministicGarbageCollector();
    const count = gc.cleanupStaleExecutions(0);
    expect(count).toBe(0);
  });

  it('cleans up orphaned snapshots', () => {
    const gc = new DeterministicGarbageCollector();
    const count = gc.cleanupOrphanedSnapshots(['a', 'b', 'c']);
    expect(count).toBe(97);
  });

  it('cleans up expired cache', () => {
    const gc = new DeterministicGarbageCollector();
    const count = gc.cleanupExpiredCache(15000);
    expect(count).toBe(15);
  });

  it('returns undefined for last run before any run', () => {
    const gc = new DeterministicGarbageCollector();
    expect(gc.getLastRun()).toBeUndefined();
  });

  it('resets state', () => {
    const gc = new DeterministicGarbageCollector();
    gc.cleanupReplay(5000);
    gc.reset();
    expect(gc.getTotalCleaned()).toBe(0);
    expect(gc.getRunCount()).toBe(0);
    expect(gc.getLastRun()).toBeUndefined();
  });
});

describe('MemoryPressureDetector', () => {
  it('starts at NORMAL', () => {
    const detector = new MemoryPressureDetector();
    expect(detector.getPressureLevel()).toBe('NORMAL');
  });

  it('transitions to ELEVATED at 65%', () => {
    const detector = new MemoryPressureDetector();
    detector.updateMetric('heap', 65, 100);
    expect(detector.getPressureLevel()).toBe('ELEVATED');
  });

  it('transitions to HIGH at 80%', () => {
    const detector = new MemoryPressureDetector();
    detector.updateMetric('heap', 80, 100);
    expect(detector.getPressureLevel()).toBe('HIGH');
  });

  it('transitions to CRITICAL at 95%', () => {
    const detector = new MemoryPressureDetector();
    detector.updateMetric('heap', 95, 100);
    expect(detector.getPressureLevel()).toBe('CRITICAL');
  });

  it('returns empty actions for NORMAL', () => {
    const detector = new MemoryPressureDetector();
    expect(detector.getRecommendedActions()).toEqual([]);
  });

  it('returns ELEVATED actions', () => {
    const detector = new MemoryPressureDetector();
    detector.updateMetric('heap', 65, 100);
    expect(detector.getRecommendedActions()).toEqual([
      'reduce_concurrency',
      'disable_noncritical_telemetry',
    ]);
  });

  it('returns HIGH actions', () => {
    const detector = new MemoryPressureDetector();
    detector.updateMetric('heap', 80, 100);
    expect(detector.getRecommendedActions()).toEqual([
      'reduce_concurrency',
      'disable_noncritical_telemetry',
      'reject_oversized_workloads',
      'trigger_cleanup',
    ]);
  });

  it('returns CRITICAL actions', () => {
    const detector = new MemoryPressureDetector();
    detector.updateMetric('heap', 95, 100);
    expect(detector.getRecommendedActions()).toEqual([
      'reduce_concurrency',
      'disable_noncritical_telemetry',
      'reject_oversized_workloads',
      'trigger_cleanup',
      'pause_admissions',
    ]);
  });

  it('getMetrics returns correct shape', () => {
    const detector = new MemoryPressureDetector();
    detector.updateMetric('heap', 50, 100);
    detector.updateMetric('graph', 30, 100);
    const metrics = detector.getMetrics();
    expect(metrics.level).toBe('NORMAL');
    expect(metrics.categoryMetrics.heap).toBe(0.5);
    expect(metrics.categoryMetrics.graph).toBe(0.3);
    expect(metrics.overallPressure).toBe(0.4);
  });

  it('resets state', () => {
    const detector = new MemoryPressureDetector();
    detector.updateMetric('heap', 95, 100);
    expect(detector.getPressureLevel()).toBe('CRITICAL');
    detector.reset();
    expect(detector.getPressureLevel()).toBe('NORMAL');
    expect(detector.getMetrics().categoryMetrics).toEqual({});
  });

  it('uses custom thresholds', () => {
    const detector = new MemoryPressureDetector({
      NORMAL_THRESHOLD: 0.5,
      ELEVATED_THRESHOLD: 0.7,
      HIGH_THRESHOLD: 0.85,
    });
    detector.updateMetric('heap', 55, 100);
    expect(detector.getPressureLevel()).toBe('ELEVATED');
  });
});

describe('ResourceQuotaPolicy', () => {
  it('checks quota within limit', () => {
    const policy = new ResourceQuotaPolicy();
    expect(policy.checkQuota('graph_nodes', 100)).toBe(true);
    expect(policy.checkQuota('graph_nodes', 60000)).toBe(false);
  });

  it('uses quota and tracks used', () => {
    const policy = new ResourceQuotaPolicy();
    const ok = policy.useQuota('graph_nodes', 1000);
    expect(ok).toBe(true);
    const quota = policy.getQuota('graph_nodes');
    expect(quota.used).toBe(1000);
    expect(quota.remaining).toBe(49000);
  });

  it('rejects useQuota that would exceed limit', () => {
    const policy = new ResourceQuotaPolicy({ maxGraphNodes: 100 });
    expect(policy.useQuota('graph_nodes', 60)).toBe(true);
    expect(policy.useQuota('graph_nodes', 50)).toBe(false);
  });

  it('releases quota', () => {
    const policy = new ResourceQuotaPolicy();
    policy.useQuota('graph_nodes', 5000);
    policy.releaseQuota('graph_nodes', 2000);
    expect(policy.getQuota('graph_nodes').used).toBe(3000);
  });

  it('does not go below zero on release', () => {
    const policy = new ResourceQuotaPolicy();
    policy.releaseQuota('graph_nodes', 999);
    expect(policy.getQuota('graph_nodes').used).toBe(0);
  });

  it('returns false for unknown resource', () => {
    const policy = new ResourceQuotaPolicy();
    expect(policy.checkQuota('unknown', 1)).toBe(false);
    expect(policy.useQuota('unknown', 1)).toBe(false);
  });

  it('getAllQuotas returns all quotas', () => {
    const policy = new ResourceQuotaPolicy();
    policy.useQuota('graph_nodes', 1000);
    policy.useQuota('graph_edges', 5000);
    const all = policy.getAllQuotas();
    expect(all.graph_nodes!.used).toBe(1000);
    expect(all.graph_edges!.used).toBe(5000);
    expect(all.prompt_size!.limit).toBe(128000);
  });

  it('resets all quotas', () => {
    const policy = new ResourceQuotaPolicy();
    policy.useQuota('graph_nodes', 5000);
    policy.reset();
    expect(policy.getQuota('graph_nodes').used).toBe(0);
  });

  it('uses custom config', () => {
    const policy = new ResourceQuotaPolicy({ maxPromptSizeBytes: 999 });
    expect(policy.getQuota('prompt_size').limit).toBe(999);
  });
});
