import { describe, it, expect } from 'vitest';
import { StartupManager } from '../../runtime/startup-manager.ts';
import { RuntimeContext } from '../../runtime/runtime-context.ts';

describe('StartupManager', () => {
  it('executes tasks in order', async () => {
    const ctx = new RuntimeContext();
    const sm = new StartupManager(ctx);
    const order: string[] = [];

    sm.add({ name: 'a', dependencies: [], timeout: 1000, execute: async () => { order.push('a'); } });
    sm.add({ name: 'b', dependencies: ['a'], timeout: 1000, execute: async () => { order.push('b'); } });

    await sm.start();
    expect(order).toEqual(['a', 'b']);
    expect(ctx.state.state).toBe('READY');
  });

  it('handles empty tasks', async () => {
    const ctx = new RuntimeContext();
    const sm = new StartupManager(ctx);
    await sm.start();
    expect(ctx.state.state).toBe('READY');
  });

  it('transitions to DEGRADED on task failure', async () => {
    const ctx = new RuntimeContext();
    const sm = new StartupManager(ctx);
    sm.add({ name: 'failing', dependencies: [], timeout: 1000, execute: async () => { throw new Error('fail'); } });
    await sm.start();
    expect(ctx.state.state).toBe('DEGRADED');
  });

  it('performs rollback', async () => {
    const ctx = new RuntimeContext();
    const sm = new StartupManager(ctx);
    const rolled: string[] = [];
    sm.add({ name: 'a', dependencies: [], timeout: 1000, execute: async () => {}, rollback: async () => { rolled.push('a'); } });
    sm.add({ name: 'b', dependencies: [], timeout: 1000, execute: async () => {}, rollback: async () => { rolled.push('b'); } });
    await sm.start();
    await sm.rollback();
    expect(rolled).toEqual(['b', 'a']);
    expect(ctx.state.state).toBe('FAILED');
  });
});
