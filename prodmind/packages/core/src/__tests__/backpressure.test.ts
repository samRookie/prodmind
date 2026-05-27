import { describe, expect, it } from 'vitest';
import { BackpressureGovernor, RequestScheduler } from '../backpressure/index.ts';

describe('BackpressureGovernor', () => {
  describe('admit', () => {
    it('admits requests when under limits', () => {
      const gov = new BackpressureGovernor({ maxQueueDepth: 100 });
      expect(gov.admit({ id: 'a' })).toBe(true);
    });

    it('rejects requests when queue depth exceeds high water mark', () => {
      const gov = new BackpressureGovernor({ maxQueueDepth: 100, highWaterMark: 0.8 });
      gov.updateQueueDepth(81);
      expect(gov.admit({ id: 'a' })).toBe(false);
    });

    it('rejects requests when memory pressure exceeds threshold', () => {
      const gov = new BackpressureGovernor({ memoryPressureThreshold: 0.8 });
      gov.updateMemoryPressure(0.9);
      expect(gov.admit({ id: 'a' })).toBe(false);
    });

    it('admits high priority requests under lowest_priority strategy when saturated', () => {
      const gov = new BackpressureGovernor({
        maxQueueDepth: 100,
        highWaterMark: 0.8,
        rejectionStrategy: 'lowest_priority',
      });
      gov.updateQueueDepth(90);
      expect(gov.admit({ id: 'a', priority: 0 })).toBe(true);
      expect(gov.admit({ id: 'b', priority: -1 })).toBe(true);
    });

    it('rejects low priority requests under lowest_priority strategy when saturated', () => {
      const gov = new BackpressureGovernor({
        maxQueueDepth: 100,
        highWaterMark: 0.8,
        rejectionStrategy: 'lowest_priority',
      });
      gov.updateQueueDepth(90);
      expect(gov.admit({ id: 'a', priority: 5 })).toBe(false);
    });

    it('rejects all under oldest strategy when saturated', () => {
      const gov = new BackpressureGovernor({
        maxQueueDepth: 100,
        highWaterMark: 0.8,
        rejectionStrategy: 'oldest',
      });
      gov.updateQueueDepth(90);
      expect(gov.admit({ id: 'a', priority: 0 })).toBe(false);
      expect(gov.admit({ id: 'b' })).toBe(false);
    });

    it('rejects all under newest strategy when saturated', () => {
      const gov = new BackpressureGovernor({
        maxQueueDepth: 100,
        highWaterMark: 0.8,
        rejectionStrategy: 'newest',
      });
      gov.updateQueueDepth(90);
      expect(gov.admit({ id: 'a', priority: 0 })).toBe(false);
      expect(gov.admit({ id: 'b' })).toBe(false);
    });

    it('tracks admitted and rejected counts', () => {
      const gov = new BackpressureGovernor({ maxQueueDepth: 10, highWaterMark: 0.5 });
      gov.admit({ id: 'a' });
      gov.admit({ id: 'b' });
      gov.updateQueueDepth(6);
      gov.admit({ id: 'c' });
      const metrics = gov.getMetrics();
      expect(metrics.admittedCount).toBe(2);
      expect(metrics.rejectedCount).toBe(1);
    });
  });

  describe('isSaturated', () => {
    it('returns false when under all thresholds', () => {
      const gov = new BackpressureGovernor({ maxQueueDepth: 100, memoryPressureThreshold: 0.8 });
      expect(gov.isSaturated()).toBe(false);
      gov.updateQueueDepth(50);
      expect(gov.isSaturated()).toBe(false);
      gov.updateMemoryPressure(0.5);
      expect(gov.isSaturated()).toBe(false);
    });

    it('returns true when queue depth exceeds high water mark', () => {
      const gov = new BackpressureGovernor({ maxQueueDepth: 100, highWaterMark: 0.85 });
      gov.updateQueueDepth(86);
      expect(gov.isSaturated()).toBe(true);
    });

    it('returns true when memory pressure exceeds threshold', () => {
      const gov = new BackpressureGovernor({ memoryPressureThreshold: 0.75 });
      gov.updateMemoryPressure(0.8);
      expect(gov.isSaturated()).toBe(true);
    });

    it('returns false when queue depth exactly equals high water mark', () => {
      const gov = new BackpressureGovernor({ maxQueueDepth: 100, highWaterMark: 0.9 });
      gov.updateQueueDepth(90);
      expect(gov.isSaturated()).toBe(false);
    });
  });

  describe('getPressureLevel', () => {
    it('returns NORMAL when under low water mark and low memory', () => {
      const gov = new BackpressureGovernor({ maxQueueDepth: 100, lowWaterMark: 0.7, memoryPressureThreshold: 0.8 });
      expect(gov.getPressureLevel()).toBe('NORMAL');
      gov.updateQueueDepth(50);
      expect(gov.getPressureLevel()).toBe('NORMAL');
      gov.updateMemoryPressure(0.3);
      expect(gov.getPressureLevel()).toBe('NORMAL');
    });

    it('returns ELEVATED when between low and high water marks or moderate memory', () => {
      const gov = new BackpressureGovernor({ maxQueueDepth: 100, lowWaterMark: 0.7, highWaterMark: 0.9, memoryPressureThreshold: 0.8 });
      gov.updateQueueDepth(75);
      expect(gov.getPressureLevel()).toBe('ELEVATED');
      gov.updateQueueDepth(50);
      gov.updateMemoryPressure(0.45);
      expect(gov.getPressureLevel()).toBe('ELEVATED');
    });

    it('returns HIGH when above high water mark or above memory threshold', () => {
      const gov = new BackpressureGovernor({ maxQueueDepth: 100, highWaterMark: 0.9, memoryPressureThreshold: 0.8 });
      gov.updateQueueDepth(95);
      expect(gov.getPressureLevel()).toBe('HIGH');
      gov.updateQueueDepth(50);
      gov.updateMemoryPressure(0.85);
      expect(gov.getPressureLevel()).toBe('HIGH');
    });

    it('returns CRITICAL when at max capacity or max memory', () => {
      const gov = new BackpressureGovernor({ maxQueueDepth: 100 });
      gov.updateQueueDepth(100);
      expect(gov.getPressureLevel()).toBe('CRITICAL');
      gov.updateQueueDepth(50);
      gov.updateMemoryPressure(1.0);
      expect(gov.getPressureLevel()).toBe('CRITICAL');
    });

    it('transitions through all levels correctly', () => {
      const gov = new BackpressureGovernor({ maxQueueDepth: 100, lowWaterMark: 0.5, highWaterMark: 0.8, memoryPressureThreshold: 0.7 });
      expect(gov.getPressureLevel()).toBe('NORMAL');
      gov.updateQueueDepth(60);
      expect(gov.getPressureLevel()).toBe('ELEVATED');
      gov.updateQueueDepth(85);
      expect(gov.getPressureLevel()).toBe('HIGH');
      gov.updateQueueDepth(100);
      expect(gov.getPressureLevel()).toBe('CRITICAL');
    });
  });

  describe('getMetrics', () => {
    it('returns a frozen object', () => {
      const gov = new BackpressureGovernor();
      const metrics = gov.getMetrics();
      expect(Object.isFrozen(metrics)).toBe(true);
    });

    it('contains all expected fields', () => {
      const gov = new BackpressureGovernor({ maxQueueDepth: 50, highWaterMark: 0.8, lowWaterMark: 0.6 });
      gov.updateQueueDepth(10);
      gov.updateMemoryPressure(0.3);
      gov.admit({ id: 'x' });
      const metrics = gov.getMetrics();
      expect(metrics).toEqual({
        queueDepth: 10,
        highWaterMark: 0.8,
        lowWaterMark: 0.6,
        memoryPressure: 0.3,
        pressureLevel: 'NORMAL',
        rejectedCount: 0,
        admittedCount: 1,
      });
    });
  });

  describe('reset', () => {
    it('resets all state to defaults', () => {
      const gov = new BackpressureGovernor();
      gov.updateQueueDepth(500);
      gov.updateMemoryPressure(0.9);
      gov.admit({ id: 'a' });
      gov.admit({ id: 'b' });
      gov.reset();
      const metrics = gov.getMetrics();
      expect(metrics.queueDepth).toBe(0);
      expect(metrics.memoryPressure).toBe(0);
      expect(metrics.admittedCount).toBe(0);
      expect(metrics.rejectedCount).toBe(0);
      expect(metrics.pressureLevel).toBe('NORMAL');
    });
  });

  describe('updateMemoryPressure', () => {
    it('clamps values to 0..1 range', () => {
      const gov = new BackpressureGovernor();
      gov.updateMemoryPressure(-0.5);
      expect(gov.getMetrics().memoryPressure).toBe(0);
      gov.updateMemoryPressure(1.5);
      expect(gov.getMetrics().memoryPressure).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('handles zero maxQueueDepth', () => {
      const gov = new BackpressureGovernor({ maxQueueDepth: 0 });
      gov.updateQueueDepth(0);
      expect(gov.isSaturated()).toBe(true);
      expect(gov.getPressureLevel()).toBe('CRITICAL');
      expect(gov.admit({ id: 'a' })).toBe(false);
    });

    it('handles max memory pressure', () => {
      const gov = new BackpressureGovernor();
      gov.updateMemoryPressure(1.0);
      expect(gov.getPressureLevel()).toBe('CRITICAL');
      expect(gov.isSaturated()).toBe(true);
    });

    it('handles empty state defaults', () => {
      const gov = new BackpressureGovernor();
      expect(gov.getMetrics().queueDepth).toBe(0);
      expect(gov.getMetrics().memoryPressure).toBe(0);
      expect(gov.getPressureLevel()).toBe('NORMAL');
    });

    it('uses default config when no options provided', () => {
      const gov = new BackpressureGovernor();
      expect(gov.admit({ id: 'a' })).toBe(true);
      expect(gov.getMetrics().pressureLevel).toBe('NORMAL');
    });

    it('handles very large queue depth', () => {
      const gov = new BackpressureGovernor({ maxQueueDepth: 1000 });
      gov.updateQueueDepth(999_999);
      expect(gov.isSaturated()).toBe(true);
      expect(gov.getPressureLevel()).toBe('CRITICAL');
    });
  });
});

describe('RequestScheduler', () => {
  describe('enqueue', () => {
    it('returns true when there is capacity', () => {
      const sched = new RequestScheduler(5);
      expect(sched.enqueue({ id: 'a' })).toBe(true);
    });

    it('returns false when full', () => {
      const sched = new RequestScheduler(2);
      expect(sched.enqueue({ id: 'a' })).toBe(true);
      expect(sched.enqueue({ id: 'b' })).toBe(true);
      expect(sched.enqueue({ id: 'c' })).toBe(false);
    });

    it('assigns default priority of 0', () => {
      const sched = new RequestScheduler(5);
      sched.enqueue({ id: 'a' });
      const item = sched.dequeue();
      expect(item?.priority).toBe(0);
    });
  });

  describe('dequeue', () => {
    it('returns undefined from empty queue', () => {
      const sched = new RequestScheduler(5);
      expect(sched.dequeue()).toBeUndefined();
    });

    it('returns highest priority item (lower number = higher priority)', () => {
      const sched = new RequestScheduler(5);
      sched.enqueue({ id: 'a', priority: 3 });
      sched.enqueue({ id: 'b', priority: 1 });
      sched.enqueue({ id: 'c', priority: 2 });
      expect(sched.dequeue()?.id).toBe('b');
      expect(sched.dequeue()?.id).toBe('c');
      expect(sched.dequeue()?.id).toBe('a');
    });

    it('preserves FIFO order within same priority', () => {
      const sched = new RequestScheduler(5);
      sched.enqueue({ id: 'a', priority: 1 });
      sched.enqueue({ id: 'b', priority: 1 });
      sched.enqueue({ id: 'c', priority: 1 });
      expect(sched.dequeue()?.id).toBe('a');
      expect(sched.dequeue()?.id).toBe('b');
      expect(sched.dequeue()?.id).toBe('c');
    });

    it('handles mixed priorities with FIFO tie-breaking', () => {
      const sched = new RequestScheduler(10);
      sched.enqueue({ id: 'a', priority: 2 });
      sched.enqueue({ id: 'b', priority: 1 });
      sched.enqueue({ id: 'c', priority: 1 });
      sched.enqueue({ id: 'd', priority: 3 });
      expect(sched.dequeue()?.id).toBe('b');
      expect(sched.dequeue()?.id).toBe('c');
      expect(sched.dequeue()?.id).toBe('a');
      expect(sched.dequeue()?.id).toBe('d');
    });
  });

  describe('getQueueDepth', () => {
    it('returns 0 for empty queue', () => {
      const sched = new RequestScheduler(5);
      expect(sched.getQueueDepth()).toBe(0);
    });

    it('returns correct count after enqueue and dequeue', () => {
      const sched = new RequestScheduler(5);
      sched.enqueue({ id: 'a' });
      sched.enqueue({ id: 'b' });
      expect(sched.getQueueDepth()).toBe(2);
      sched.dequeue();
      expect(sched.getQueueDepth()).toBe(1);
    });
  });

  describe('getQueueCapacity', () => {
    it('returns the capacity set in constructor', () => {
      const sched = new RequestScheduler(42);
      expect(sched.getQueueCapacity()).toBe(42);
    });

    it('handles zero capacity', () => {
      const sched = new RequestScheduler(0);
      expect(sched.enqueue({ id: 'a' })).toBe(false);
      expect(sched.dequeue()).toBeUndefined();
      expect(sched.getQueueDepth()).toBe(0);
    });
  });

  describe('clear', () => {
    it('empties the queue', () => {
      const sched = new RequestScheduler(5);
      sched.enqueue({ id: 'a' });
      sched.enqueue({ id: 'b' });
      sched.clear();
      expect(sched.getQueueDepth()).toBe(0);
      expect(sched.dequeue()).toBeUndefined();
    });

    it('allows enqueue after clear', () => {
      const sched = new RequestScheduler(5);
      sched.enqueue({ id: 'a' });
      sched.clear();
      expect(sched.enqueue({ id: 'b' })).toBe(true);
      expect(sched.getQueueDepth()).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('handles enqueue after dequeue from full queue', () => {
      const sched = new RequestScheduler(2);
      sched.enqueue({ id: 'a' });
      sched.enqueue({ id: 'b' });
      expect(sched.enqueue({ id: 'c' })).toBe(false);
      sched.dequeue();
      expect(sched.enqueue({ id: 'c' })).toBe(true);
      expect(sched.getQueueDepth()).toBe(2);
    });

    it('handles single item queue', () => {
      const sched = new RequestScheduler(1);
      expect(sched.enqueue({ id: 'a' })).toBe(true);
      expect(sched.enqueue({ id: 'b' })).toBe(false);
      const item = sched.dequeue();
      expect(item?.id).toBe('a');
      expect(sched.dequeue()).toBeUndefined();
    });

    it('handles negative priorities correctly', () => {
      const sched = new RequestScheduler(5);
      sched.enqueue({ id: 'a', priority: 5 });
      sched.enqueue({ id: 'b', priority: -1 });
      sched.enqueue({ id: 'c', priority: 0 });
      expect(sched.dequeue()?.id).toBe('b');
      expect(sched.dequeue()?.id).toBe('c');
      expect(sched.dequeue()?.id).toBe('a');
    });
  });
});
