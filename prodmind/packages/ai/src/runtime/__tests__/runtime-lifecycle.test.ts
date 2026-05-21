import { describe, expect, it } from 'vitest';

import { RuntimeLifecycle } from '../lifecycle/runtime-lifecycle.ts';

describe('RuntimeLifecycle', () => {
  it('starts at CREATED', () => {
    const lc = new RuntimeLifecycle();
    expect(lc.stage).toBe('CREATED');
  });

  it('transitions through happy path', () => {
    const lc = new RuntimeLifecycle();
    lc.queue();
    expect(lc.stage).toBe('QUEUED');
    lc.validate();
    expect(lc.stage).toBe('VALIDATED');
    lc.schedule();
    expect(lc.stage).toBe('SCHEDULED');
    lc.execute();
    expect(lc.stage).toBe('EXECUTING');
    lc.normalize();
    expect(lc.stage).toBe('NORMALIZING');
    lc.validating();
    expect(lc.stage).toBe('VALIDATING');
    lc.complete();
    expect(lc.stage).toBe('COMPLETED');
  });

  it('supports retry path', () => {
    const lc = new RuntimeLifecycle();
    lc.queue();
    lc.validate();
    lc.schedule();
    lc.execute();
    lc.retry();
    expect(lc.stage).toBe('RETRYING');
    lc.execute();
    expect(lc.stage).toBe('EXECUTING');
  });

  it('supports failure path', () => {
    const lc = new RuntimeLifecycle();
    lc.queue();
    lc.validate();
    lc.schedule();
    lc.execute();
    lc.fail();
    expect(lc.stage).toBe('FAILED');
  });

  it('replay works from COMPLETED', () => {
    const lc = new RuntimeLifecycle();
    lc.queue();
    lc.validate();
    lc.schedule();
    lc.execute();
    lc.normalize();
    lc.validating();
    lc.complete();
    lc.replay();
    expect(lc.stage).toBe('REPLAYED');
  });

  it('replay works from FAILED', () => {
    const lc = new RuntimeLifecycle();
    lc.queue();
    lc.validate();
    lc.schedule();
    lc.execute();
    lc.fail();
    lc.replay();
    expect(lc.stage).toBe('REPLAYED');
  });

  it('cancellation works from relevant stages', () => {
    const lc = new RuntimeLifecycle();
    lc.queue();
    lc.cancel();
    expect(lc.stage).toBe('CANCELLED');
  });

  it('isTerminal returns true for terminal stages', () => {
    const lc = new RuntimeLifecycle();
    lc.queue();
    lc.validate();
    lc.schedule();
    lc.execute();
    lc.fail();
    expect(lc.isTerminal).toBe(true);
  });

  it('isTerminal returns false for non-terminal stages', () => {
    const lc = new RuntimeLifecycle();
    expect(lc.isTerminal).toBe(false);
  });

  it('getHistory returns recorded transitions', () => {
    const lc = new RuntimeLifecycle();
    lc.queue();
    lc.validate();
    const history = lc.getHistory();
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0]?.stage).toBeDefined();
    expect(Object.isFrozen(history)).toBe(true);
  });

  it('canTransition checks allowed transitions', () => {
    const lc = new RuntimeLifecycle();
    expect(lc.canTransition('QUEUE')).toBe(true);
    expect(lc.canTransition('FAIL')).toBe(false);
    expect(lc.canTransition('EXECUTE')).toBe(false);
  });
});
