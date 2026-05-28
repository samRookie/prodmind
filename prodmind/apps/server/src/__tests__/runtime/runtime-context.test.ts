import { describe, it, expect } from 'vitest';
import { RuntimeContext } from '../../runtime/runtime-context.ts';

describe('RuntimeContext', () => {
  it('creates with STARTING state', () => {
    const ctx = new RuntimeContext();
    expect(ctx.state.state).toBe('STARTING');
  });

  it('registers and retrieves services', () => {
    const ctx = new RuntimeContext();
    ctx.register('test', { value: 42 });
    expect(ctx.get<{ value: number }>('test')?.value).toBe(42);
  });

  it('returns undefined for missing service', () => {
    const ctx = new RuntimeContext();
    expect(ctx.get('nonexistent')).toBeUndefined();
  });

  it('throws on required missing service', () => {
    const ctx = new RuntimeContext();
    expect(() => ctx.require('missing')).toThrow();
  });

  it('stores startedAt timestamp', () => {
    const ctx = new RuntimeContext();
    expect(ctx.startedAt).toBeTruthy();
    expect(() => new Date(ctx.startedAt)).not.toThrow();
  });
});
