import { describe, it, expect } from 'vitest';
import { StateMachine } from '../state-machine.ts';
import { InvalidTransitionError } from '../errors.ts';

type TestState = 'idle' | 'running' | 'completed' | 'failed';
type TestEvent = 'start' | 'finish' | 'error' | 'reset';

describe('StateMachine', () => {
  const config = {
    initialState: 'idle' as TestState,
    states: ['idle', 'running', 'completed', 'failed'] as readonly TestState[],
    events: ['start', 'finish', 'error', 'reset'] as readonly TestEvent[],
    transitions: [
      { from: 'idle', event: 'start', to: 'running' },
      { from: 'running', event: 'finish', to: 'completed' },
      { from: 'running', event: 'error', to: 'failed' },
      { from: 'failed', event: 'reset', to: 'idle' },
    ] as const,
  };

  it('starts in initial state', () => {
    const sm = new StateMachine(config);
    expect(sm.currentState).toBe('idle');
  });

  it('transitions on valid event', () => {
    const sm = new StateMachine(config);
    sm.transition('start');
    expect(sm.currentState).toBe('running');
  });

  it('throws on invalid transition', () => {
    const sm = new StateMachine(config);
    expect(() => sm.transition('finish')).toThrow(InvalidTransitionError);
  });

  it('canTransition returns true for valid transitions', () => {
    const sm = new StateMachine(config);
    expect(sm.canTransition('start')).toBe(true);
    expect(sm.canTransition('finish')).toBe(false);
  });

  it('supports chained transitions', () => {
    const sm = new StateMachine(config);
    sm.transition('start');
    sm.transition('finish');
    expect(sm.currentState).toBe('completed');
  });

  it('reset returns to initial state', () => {
    const sm = new StateMachine(config);
    sm.transition('start');
    sm.transition('error');
    expect(sm.currentState).toBe('failed');
    sm.reset();
    expect(sm.currentState).toBe('idle');
  });

  it('snapshot returns current state and allowed events', () => {
    const sm = new StateMachine(config);
    const snap = sm.snapshot();
    expect(snap.currentState).toBe('idle');
    expect(snap.allowedEvents).toContain('start');
    expect(snap.allowedEvents).not.toContain('finish');
    expect(Object.isFrozen(snap)).toBe(true);
  });

  it('supports guards that prevent transitions', () => {
    const sm = new StateMachine({
      ...config,
      guards: {
        'idle:start': () => false,
      },
    });

    expect(sm.canTransition('start')).toBe(false);
    expect(() => sm.transition('start')).toThrow(InvalidTransitionError);
  });

  it('guards that return true allow transitions', () => {
    const sm = new StateMachine({
      ...config,
      guards: {
        'idle:start': () => true,
      },
    });

    expect(sm.canTransition('start')).toBe(true);
    sm.transition('start');
    expect(sm.currentState).toBe('running');
  });

  it('snapshot shows correct allowed events after transitions', () => {
    const sm = new StateMachine(config);
    sm.transition('start');
    const snap = sm.snapshot();
    expect(snap.currentState).toBe('running');
    expect(snap.allowedEvents).toContain('finish');
    expect(snap.allowedEvents).toContain('error');
    expect(snap.allowedEvents).not.toContain('start');
  });
});
