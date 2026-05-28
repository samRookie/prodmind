import { describe, it, expect } from 'vitest';
import { ShutdownManager } from '../../runtime/shutdown-manager.ts';
import { RuntimeContext } from '../../runtime/runtime-context.ts';

describe('ShutdownManager', () => {
  it('executes tasks by priority', async () => {
    const ctx = new RuntimeContext();
    const sm = new ShutdownManager(ctx);
    const order: string[] = [];

    sm.register('low', async () => { order.push('low'); }, 200);
    sm.register('high', async () => { order.push('high'); }, 50);

    await sm.shutdown();
    expect(order).toEqual(['high', 'low']);
  });

  it('transitions to SHUTTING_DOWN then FAILED', async () => {
    const ctx = new RuntimeContext();
    const sm = new ShutdownManager(ctx);
    sm.register('a', async () => {}, 100);
    await sm.shutdown();
    expect(ctx.state.state).toBe('FAILED');
  });

  it('throws on shutdown timeout', async () => {
    const ctx = new RuntimeContext();
    const sm = new ShutdownManager(ctx);
    sm.register('slow', async () => { await new Promise(r => setTimeout(r, 500)); }, 100, 1);
    await expect(sm.shutdown()).rejects.toThrow();
  });
});
