import { describe, expect, it } from 'vitest';

import { createRuntimeExecutionRequest,createRuntimePolicy } from '../contracts/runtime-contracts.ts';
import { RuntimeScheduler } from '../scheduling/runtime-scheduler.ts';

function makeRequest(executionId: string) {
  return createRuntimeExecutionRequest({
    executionId,
    provider: 'mock',
    model: 'mock-v1',
    prompt: 'test',
    correlationId: 'corr',
  });
}

describe('RuntimeScheduler', () => {
  it('enqueues and returns scheduling decision', () => {
    const scheduler = new RuntimeScheduler(createRuntimePolicy({}));
    const req = makeRequest('exec-1');
    const decision = scheduler.enqueue(req);
    expect(decision.queuePosition).toBe(0);
    expect(decision.queueDepth).toBe(1);
    expect(decision.priority).toBe(0);
  });

  it('dequeues in FIFO order with same priority', () => {
    const scheduler = new RuntimeScheduler(createRuntimePolicy({}));
    scheduler.enqueue(makeRequest('exec-1'));
    scheduler.enqueue(makeRequest('exec-2'));
    const first = scheduler.dequeue();
    expect(first?.executionId).toBe('exec-1');
    const second = scheduler.dequeue();
    expect(second?.executionId).toBe('exec-2');
  });

  it('dequeues higher priority first', () => {
    const scheduler = new RuntimeScheduler(createRuntimePolicy({}));
    scheduler.enqueue(makeRequest('exec-1'), 0);
    scheduler.enqueue(makeRequest('exec-2'), 10);
    const first = scheduler.dequeue();
    expect(first?.executionId).toBe('exec-2');
  });

  it('respects concurrency limit', () => {
    const scheduler = new RuntimeScheduler(createRuntimePolicy({ concurrencyLimit: 2 }));
    scheduler.enqueue(makeRequest('exec-1'));
    scheduler.enqueue(makeRequest('exec-2'));
    scheduler.enqueue(makeRequest('exec-3'));
    scheduler.dequeue();
    scheduler.dequeue();
    expect(scheduler.dequeue()).toBeNull();
  });

  it('dequeues after previous completes', () => {
    const scheduler = new RuntimeScheduler(createRuntimePolicy({ concurrencyLimit: 1 }));
    scheduler.enqueue(makeRequest('exec-1'));
    scheduler.enqueue(makeRequest('exec-2'));
    scheduler.dequeue();
    scheduler.complete();
    const next = scheduler.dequeue();
    expect(next?.executionId).toBe('exec-2');
  });

  it('tracks queue depth and active count', () => {
    const scheduler = new RuntimeScheduler(createRuntimePolicy({ concurrencyLimit: 5 }));
    scheduler.enqueue(makeRequest('exec-1'));
    scheduler.enqueue(makeRequest('exec-2'));
    expect(scheduler.getQueueDepth()).toBe(2);
    scheduler.dequeue();
    expect(scheduler.getActiveCount()).toBe(1);
    scheduler.complete();
    expect(scheduler.getActiveCount()).toBe(0);
  });

  it('clear resets state', () => {
    const scheduler = new RuntimeScheduler(createRuntimePolicy({}));
    scheduler.enqueue(makeRequest('exec-1'));
    scheduler.clear();
    expect(scheduler.getQueueDepth()).toBe(0);
    expect(scheduler.getActiveCount()).toBe(0);
  });

  it('returns null on empty queue', () => {
    const scheduler = new RuntimeScheduler(createRuntimePolicy({}));
    expect(scheduler.dequeue()).toBeNull();
  });
});
