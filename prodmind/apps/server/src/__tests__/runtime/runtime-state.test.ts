import { describe, it, expect } from 'vitest';
import { RuntimeStateManager } from '../../runtime/runtime-state.ts';

describe('RuntimeStateManager', () => {
  it('starts in STARTING state', () => {
    const m = new RuntimeStateManager();
    expect(m.state).toBe('STARTING');
  });

  it('transitions to READY', () => {
    const m = new RuntimeStateManager();
    m.transition('READY');
    expect(m.state).toBe('READY');
  });

  it('tracks previous state', () => {
    const m = new RuntimeStateManager();
    m.transition('READY');
    m.transition('DEGRADED');
    expect(m.previousState).toBe('READY');
  });

  it('records state history', () => {
    const m = new RuntimeStateManager();
    m.transition('READY');
    m.transition('DEGRADED');
    expect(m.stateHistory.length).toBe(3);
  });

  it('records failure reasons on DEGRADED', () => {
    const m = new RuntimeStateManager();
    m.transition('DEGRADED', 'memory pressure');
    expect(m.failureReasons).toContain('memory pressure');
  });

  it('records failure reasons on FAILED', () => {
    const m = new RuntimeStateManager();
    m.transition('FAILED', 'bootstrap error');
    expect(m.failureReasons).toContain('bootstrap error');
  });

  it('isRunning returns true for READY', () => {
    const m = new RuntimeStateManager();
    m.transition('READY');
    expect(m.isRunning).toBe(true);
  });

  it('isRunning returns true for DEGRADED', () => {
    const m = new RuntimeStateManager();
    m.transition('DEGRADED');
    expect(m.isRunning).toBe(true);
  });

  it('isRunning returns false for STARTING', () => {
    const m = new RuntimeStateManager();
    expect(m.isRunning).toBe(false);
  });

  it('isRunning returns false for SHUTTING_DOWN', () => {
    const m = new RuntimeStateManager();
    m.transition('SHUTTING_DOWN');
    expect(m.isRunning).toBe(false);
  });

  it('isRunning returns false for FAILED', () => {
    const m = new RuntimeStateManager();
    m.transition('FAILED');
    expect(m.isRunning).toBe(false);
  });
});
