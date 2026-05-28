import { describe, it, expect } from 'vitest';
import { RuntimeBootstrap } from '../../runtime/bootstrap.ts';

describe('RuntimeBootstrap', () => {
  it('creates with context', () => {
    const b = new RuntimeBootstrap();
    expect(b.context.state.state).toBe('STARTING');
  });

  it('generates fingerprint', () => {
    const b = new RuntimeBootstrap();
    expect(b.getFingerprint()).toBeTruthy();
  });

  it('initializes successfully with no custom tasks', async () => {
    const b = new RuntimeBootstrap();
    const ctx = await b.initialize();
    expect(ctx.state.state).toBe('READY');
  });
});
