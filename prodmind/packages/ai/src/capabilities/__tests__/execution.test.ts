import { describe, expect, it, vi } from 'vitest';

import { ToolExecutor } from '../execution/tool-executor.ts';
import { ExecutionRunner } from '../execution/execution-runner.ts';
import { ExecutionSession } from '../execution/execution-session.ts';
import { ExecutionQueue } from '../execution/execution-queue.ts';
import { ExecutionTimeout } from '../execution/execution-timeout.ts';
import { DEFAULT_CAPABILITY_POLICY } from '../contracts/capability-policy.ts';

/* ------------------------------------------------------------------ */
/*  ExecutionSession                                                     */
/* ------------------------------------------------------------------ */
describe('ExecutionSession', () => {
  it('starts empty', () => {
    const s = new ExecutionSession();
    expect(s.count).toBe(0);
    expect(s.events).toEqual([]);
  });

  it('records frozen events', () => {
    const s = new ExecutionSession();
    s.recordEvent({ type: 'execution_started', toolId: 't1', traceId: 'tr1', timestamp: 100 });
    expect(s.count).toBe(1);
    expect(Object.isFrozen(s.events[0])).toBe(true);
  });

  it('clears', () => {
    const s = new ExecutionSession();
    s.recordEvent({ type: 'execution_started', toolId: 't1', traceId: 'tr1', timestamp: 100 });
    s.clear();
    expect(s.count).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  ExecutionQueue                                                       */
/* ------------------------------------------------------------------ */
describe('ExecutionQueue', () => {
  it('starts empty', () => {
    const q = new ExecutionQueue<string>();
    expect(q.isEmpty).toBe(true);
    expect(q.length).toBe(0);
  });

  it('enqueues and dequeues in FIFO order', () => {
    const q = new ExecutionQueue<string>();
    q.enqueue('a');
    q.enqueue('b');
    expect(q.dequeue()).toBe('a');
    expect(q.dequeue()).toBe('b');
    expect(q.isEmpty).toBe(true);
  });

  it('peeks without removing', () => {
    const q = new ExecutionQueue<string>();
    q.enqueue('a');
    expect(q.peek()).toBe('a');
    expect(q.length).toBe(1);
  });

  it('rejects when full', () => {
    const q = new ExecutionQueue<string>(2);
    expect(q.enqueue('a')).toBe(true);
    expect(q.enqueue('b')).toBe(true);
    expect(q.enqueue('c')).toBe(false);
  });

  it('clears', () => {
    const q = new ExecutionQueue<string>();
    q.enqueue('a');
    q.clear();
    expect(q.isEmpty).toBe(true);
  });

  it('freezes items', () => {
    const q = new ExecutionQueue<string>();
    q.enqueue('a');
    expect(Object.isFrozen(q.items)).toBe(true);
    expect(q.items[0]?.item).toBe('a');
  });
});

/* ------------------------------------------------------------------ */
/*  ExecutionTimeout                                                     */
/* ------------------------------------------------------------------ */
describe('ExecutionTimeout', () => {
  it('resolves before timeout', async () => {
    const t = new ExecutionTimeout(1000);
    const result = await t.withTimeout(
      Promise.resolve(Object.freeze({
        request: Object.freeze({ toolId: 't1', input: Object.freeze({}), traceId: 'tr1', timestamp: 0 }),
        status: 'completed' as const, output: Object.freeze({}), error: null, failureCode: null, durationMs: 0,
      })),
    );
    expect(result.status).toBe('completed');
  });

  it('returns timed_out status on timeout', async () => {
    const t = new ExecutionTimeout(10);
    const result = await t.withTimeout(
      new Promise(() => { /* never resolves */ }) as never,
    );
    expect(result.status).toBe('timed_out');
    expect(result.failureCode).toBe('timeout');
  });
});

/* ------------------------------------------------------------------ */
/*  ExecutionRunner                                                      */
/* ------------------------------------------------------------------ */
describe('ExecutionRunner', () => {
  it('runs a sync handler', () => {
    const runner = new ExecutionRunner();
    runner.setHandler(() => ({ result: 'ok' }));
    const req = Object.freeze({ toolId: 't1', input: Object.freeze({}), traceId: 'tr1', timestamp: 0 });
    const result = runner.run(req);
    expect(result.status).toBe('completed');
    expect(result.output).toEqual({ result: 'ok' });
  });

  it('returns failure when no handler registered', () => {
    const runner = new ExecutionRunner();
    const req = Object.freeze({ toolId: 't1', input: Object.freeze({}), traceId: 'tr1', timestamp: 0 });
    const result = runner.run(req);
    expect(result.status).toBe('failed');
    expect(result.error).toBe('no handler registered');
  });

  it('catches sync handler errors', () => {
    const runner = new ExecutionRunner();
    runner.setHandler(() => { throw new Error('handler error'); });
    const req = Object.freeze({ toolId: 't1', input: Object.freeze({}), traceId: 'tr1', timestamp: 0 });
    const result = runner.run(req);
    expect(result.status).toBe('failed');
    expect(result.error).toBe('handler error');
  });

  it('runs an async handler', async () => {
    const runner = new ExecutionRunner();
    runner.setAsyncHandler(async () => ({ async: true }));
    const req = Object.freeze({ toolId: 't1', input: Object.freeze({}), traceId: 'tr1', timestamp: 0 });
    const result = await runner.runAsync(req);
    expect(result.status).toBe('completed');
    expect(result.output).toEqual({ async: true });
  });

  it('no async handler returns failure', async () => {
    const runner = new ExecutionRunner();
    const req = Object.freeze({ toolId: 't1', input: Object.freeze({}), traceId: 'tr1', timestamp: 0 });
    const result = await runner.runAsync(req);
    expect(result.status).toBe('failed');
    expect(result.error).toBe('no async handler registered');
  });
});

/* ------------------------------------------------------------------ */
/*  ToolExecutor                                                         */
/* ------------------------------------------------------------------ */
describe('ToolExecutor', () => {
  it('executes a tool and records session events', () => {
    const executor = new ToolExecutor(DEFAULT_CAPABILITY_POLICY);
    executor.sandbox.governance.reset();

    executor.execute('test_tool', { query: 'hello' }, 'trace_1');
    expect(executor.session.count).toBeGreaterThanOrEqual(2);
  });

  it('executes async tool', async () => {
    const executor = new ToolExecutor(DEFAULT_CAPABILITY_POLICY);
    executor.sandbox.governance.reset();

    const result = await executor.executeAsync('test_tool', { query: 'async' }, 'trace_2');
    expect(result.status).toBe('failed');
    expect(result.error).toBe('no async handler registered');
  });

  it('resets state', () => {
    const executor = new ToolExecutor(DEFAULT_CAPABILITY_POLICY);
    executor.execute('t1', {}, 'tr1');
    executor.reset();
    expect(executor.session.count).toBe(0);
  });

  it('freezes execution results', () => {
    const executor = new ToolExecutor(DEFAULT_CAPABILITY_POLICY);
    executor.sandbox.governance.reset();
    const result = executor.execute('t1', {}, 'tr1');
    expect(Object.isFrozen(result)).toBe(true);
  });
});
