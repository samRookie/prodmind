import { describe, expect, it, vi } from 'vitest';

import type { LifecycleMiddleware } from '../lifecycle.ts';
import { LifecycleManager } from '../lifecycle.ts';

describe('LifecycleManager', () => {
  it('emits no hooks when no middlewares are registered', async () => {
    const mgr = new LifecycleManager();
    await mgr.onWorkflowStart('wf', 'exec', 'trace');
  });

  it('calls registered middleware on emit', async () => {
    const mgr = new LifecycleManager();
    const fn = vi.fn();
    mgr.register({
      hook: 'onWorkflowStart',
      execute(ctx) {
        fn(ctx.hook);
        return Promise.resolve();
      },
    });

    await mgr.onWorkflowStart('wf', 'exec', 'trace');
    expect(fn).toHaveBeenCalledWith('onWorkflowStart');
  });

  it('calls multiple middlewares for same hook in order', async () => {
    const mgr = new LifecycleManager();
    const order: number[] = [];
    mgr.register({
      hook: 'onWorkflowStart',
      execute() { order.push(1); return Promise.resolve(); },
    });
    mgr.register({
      hook: 'onWorkflowStart',
      execute() { order.push(2); return Promise.resolve(); },
    });

    await mgr.onWorkflowStart('wf', 'exec', 'trace');
    expect(order).toEqual([1, 2]);
  });

  it('registerAll registers multiple middlewares', async () => {
    const mgr = new LifecycleManager();
    const fn = vi.fn();
    const middlewares: LifecycleMiddleware[] = [
      { hook: 'beforeStep', execute() { fn('before'); return Promise.resolve(); } },
      { hook: 'afterStep', execute() { fn('after'); return Promise.resolve(); } },
    ];
    mgr.registerAll(middlewares);

    await mgr.emit({ hook: 'beforeStep', workflowId: '', executionId: '', traceId: '', timestamp: 0 });
    expect(fn).toHaveBeenCalledWith('before');
  });

  it('clear removes all middlewares', async () => {
    const mgr = new LifecycleManager();
    const fn = vi.fn();
    mgr.register({
      hook: 'onWorkflowComplete',
      execute() { fn(); return Promise.resolve(); },
    });
    mgr.clear();
    await mgr.onWorkflowComplete('wf', 'exec', 'trace', 100);
    expect(fn).not.toHaveBeenCalled();
  });

  it('lifecycle hooks pass correct context fields', async () => {
    const mgr = new LifecycleManager();
    const captured: unknown[] = [];
    mgr.register({
      hook: 'onStepError',
      execute(ctx) { captured.push(ctx); return Promise.resolve(); },
    });

    await mgr.onStepError('wf', 'exec', 'trace', 'step-1', 'Step One', new Error('fail'));
    expect(captured).toHaveLength(1);
    const ctx = captured[0] as Record<string, unknown>;
    expect(ctx.workflowId).toBe('wf');
    expect(ctx.stepId).toBe('step-1');
    expect(ctx.stepName).toBe('Step One');
    expect(ctx.errorMessage).toBe('fail');
  });
});
