import { describe, expect,it } from 'vitest';

import { createCancellationScope } from '../cancellation.ts';

describe('CancellationScope', () => {
  it('starts not cancelled', () => {
    const scope = createCancellationScope();
    expect(scope.isCancelled).toBe(false);
    expect(scope.reason).toBeNull();
  });

  it('cancel triggers abort signal', () => {
    const scope = createCancellationScope();
    expect(scope.signal.aborted).toBe(false);
    scope.cancel('test reason');
    expect(scope.isCancelled).toBe(true);
    expect(scope.signal.aborted).toBe(true);
    expect(scope.reason).toBe('test reason');
  });

  it('cancel is idempotent', () => {
    const scope = createCancellationScope();
    scope.cancel('reason 1');
    scope.cancel('reason 2');
    expect(scope.reason).toBe('reason 1');
  });

  it('child scope is cancelled when parent is cancelled', () => {
    const parent = createCancellationScope();
    const child = parent.createChildScope();
    parent.cancel('parent cancelled');
    expect(child.isCancelled).toBe(true);
  });

  it('child scope can be cancelled independently', () => {
    const parent = createCancellationScope();
    const child = parent.createChildScope();
    child.cancel('child cancelled');
    expect(child.isCancelled).toBe(true);
    expect(parent.isCancelled).toBe(false);
  });

  it('cancelAll cancels all children', () => {
    const parent = createCancellationScope();
    const child1 = parent.createChildScope();
    const child2 = parent.createChildScope();
    parent.cancelAll();
    expect(parent.isCancelled).toBe(true);
    expect(child1.isCancelled).toBe(true);
    expect(child2.isCancelled).toBe(true);
  });

  it('nested cancellation propagates', () => {
    const root = createCancellationScope();
    const mid = root.createChildScope();
    const leaf = mid.createChildScope();
    mid.cancel('mid cancelled');
    expect(root.isCancelled).toBe(false);
    expect(mid.isCancelled).toBe(true);
    expect(leaf.isCancelled).toBe(true);
  });
});
