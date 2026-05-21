import { describe, expect, it } from 'vitest';

import { ToolRegistry } from '../registry/tool-registry.ts';
import { CapabilityResolver } from '../registry/capability-resolver.ts';
import { ExecutionSandbox } from '../sandbox/execution-sandbox.ts';
import { SandboxGovernance } from '../sandbox/sandbox-governance.ts';
import { SandboxLimits } from '../sandbox/sandbox-limits.ts';
import type { ToolContract } from '../contracts/tool-contract.ts';
import { DEFAULT_CAPABILITY_POLICY } from '../contracts/capability-policy.ts';

/* ------------------------------------------------------------------ */
/*  ToolRegistry                                                        */
/* ------------------------------------------------------------------ */
describe('ToolRegistry', () => {
  it('starts empty', () => {
    const reg = new ToolRegistry();
    expect(reg.count).toBe(0);
    expect(reg.all).toEqual([]);
  });

  it('registers and retrieves tools', () => {
    const reg = new ToolRegistry();
    const tool: ToolContract = Object.freeze({
      id: 't1', name: 'graph-parser', category: 'parser', version: '1.0.0',
      description: '', timeoutMs: 5000, deterministic: true,
      schema: Object.freeze({}), dependencies: Object.freeze([]),
    });
    reg.register(tool);
    expect(reg.has('t1')).toBe(true);
    expect(reg.get('t1')).toBe(tool);
    expect(reg.count).toBe(1);
  });

  it('refuses duplicate registration', () => {
    const reg = new ToolRegistry();
    const tool: ToolContract = Object.freeze({
      id: 't1', name: 'g', category: 'parser', version: '1.0.0',
      description: '', timeoutMs: 5, deterministic: true,
      schema: Object.freeze({}), dependencies: Object.freeze([]),
    });
    reg.register(tool);
    reg.register(tool);
    expect(reg.count).toBe(1);
  });

  it('filters by category', () => {
    const reg = new ToolRegistry();
    reg.register(Object.freeze({ id: 'a', name: 'a', category: 'parser', version: '1', description: '', timeoutMs: 1, deterministic: true, schema: Object.freeze({}), dependencies: Object.freeze([]) }));
    reg.register(Object.freeze({ id: 'b', name: 'b', category: 'graph', version: '1', description: '', timeoutMs: 1, deterministic: true, schema: Object.freeze({}), dependencies: Object.freeze([]) }));
    expect(reg.getByCategory('parser')).toHaveLength(1);
    expect(reg.getByCategory('graph')).toHaveLength(1);
  });

  it('generates manifest', () => {
    const reg = new ToolRegistry();
    reg.register(Object.freeze({ id: 't1', name: 't1', category: 'parser', version: '1', description: '', timeoutMs: 1, deterministic: true, schema: Object.freeze({}), dependencies: Object.freeze([]) }));
    const manifest = reg.toManifest();
    expect(manifest.count).toBe(1);
    expect(manifest.tools).toHaveLength(1);
    expect(Object.isFrozen(manifest)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  CapabilityResolver                                                   */
/* ------------------------------------------------------------------ */
describe('CapabilityResolver', () => {
  it('resolves a tool by id within policy', () => {
    const reg = new ToolRegistry();
    const tool: ToolContract = Object.freeze({
      id: 't1', name: 't1', category: 'retrieval', version: '1',
      description: '', timeoutMs: 1, deterministic: true,
      schema: Object.freeze({}), dependencies: Object.freeze([]),
    });
    reg.register(tool);
    const resolver = new CapabilityResolver(reg);
    expect(resolver.resolve('t1', DEFAULT_CAPABILITY_POLICY)?.id).toBe('t1');
  });

  it('returns undefined for tools outside policy categories', () => {
    const reg = new ToolRegistry();
    const tool: ToolContract = Object.freeze({
      id: 't1', name: 't1', category: 'parser', version: '1',
      description: '', timeoutMs: 1, deterministic: true,
      schema: Object.freeze({}), dependencies: Object.freeze([]),
    });
    reg.register(tool);
    const resolver = new CapabilityResolver(reg);
    expect(resolver.resolve('t1', DEFAULT_CAPABILITY_POLICY)).toBeUndefined();
  });

  it('returns undefined for unknown tool', () => {
    const resolver = new CapabilityResolver(new ToolRegistry());
    expect(resolver.resolve('nope', DEFAULT_CAPABILITY_POLICY)).toBeUndefined();
  });

  it('resolves by category within policy', () => {
    const reg = new ToolRegistry();
    reg.register(Object.freeze({ id: 'a', name: 'a', category: 'retrieval', version: '1', description: '', timeoutMs: 1, deterministic: true, schema: Object.freeze({}), dependencies: Object.freeze([]) }));
    const resolver = new CapabilityResolver(reg);
    expect(resolver.resolveByCategory('retrieval', DEFAULT_CAPABILITY_POLICY)).toHaveLength(1);
    expect(resolver.resolveByCategory('parser', DEFAULT_CAPABILITY_POLICY)).toHaveLength(0);
  });

  it('resolves all tools matching policy', () => {
    const reg = new ToolRegistry();
    reg.register(Object.freeze({ id: 'a', name: 'a', category: 'retrieval', version: '1', description: '', timeoutMs: 1, deterministic: true, schema: Object.freeze({}), dependencies: Object.freeze([]) }));
    reg.register(Object.freeze({ id: 'b', name: 'b', category: 'analysis', version: '1', description: '', timeoutMs: 1, deterministic: true, schema: Object.freeze({}), dependencies: Object.freeze([]) }));
    reg.register(Object.freeze({ id: 'c', name: 'c', category: 'parser', version: '1', description: '', timeoutMs: 1, deterministic: true, schema: Object.freeze({}), dependencies: Object.freeze([]) }));
    const resolver = new CapabilityResolver(reg);
    expect(resolver.resolveAll(DEFAULT_CAPABILITY_POLICY)).toHaveLength(2);
  });
});

/* ------------------------------------------------------------------ */
/*  SandboxLimits                                                        */
/* ------------------------------------------------------------------ */
describe('SandboxLimits', () => {
  it('creates with defaults', () => {
    const l = new SandboxLimits();
    expect(l.maxExecutions).toBe(100);
    expect(l.maxCumulativeDurationMs).toBe(60000);
    expect(l.maxSingleDurationMs).toBe(10000);
    expect(l.maxConcurrency).toBe(3);
    expect(Object.isFrozen(l)).toBe(true);
  });

  it('accepts overrides', () => {
    const l = new SandboxLimits({ maxExecutions: 5, maxSingleDurationMs: 1000 });
    expect(l.maxExecutions).toBe(5);
    expect(l.maxCumulativeDurationMs).toBe(60000);
    expect(l.maxSingleDurationMs).toBe(1000);
  });
});

/* ------------------------------------------------------------------ */
/*  SandboxGovernance                                                    */
/* ------------------------------------------------------------------ */
describe('SandboxGovernance', () => {
  it('allows execution within limits', () => {
    const g = new SandboxGovernance(new SandboxLimits({ maxExecutions: 2, maxCumulativeDurationMs: 1000 }));
    expect(g.canExecute()).toBe(true);
    g.recordExecution(100);
    expect(g.canExecute()).toBe(true);
    g.recordExecution(100);
    expect(g.canExecute()).toBe(false);
  });

  it('rejects execution when cumulative duration exceeded', () => {
    const g = new SandboxGovernance(new SandboxLimits({ maxExecutions: 10, maxCumulativeDurationMs: 50 }));
    g.recordExecution(60);
    expect(g.canExecute()).toBe(false);
  });

  it('resets counters', () => {
    const g = new SandboxGovernance(new SandboxLimits({ maxExecutions: 1 }));
    g.recordExecution(10);
    expect(g.canExecute()).toBe(false);
    g.reset();
    expect(g.canExecute()).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  ExecutionSandbox                                                     */
/* ------------------------------------------------------------------ */
describe('ExecutionSandbox', () => {
  it('executes a synchronous function', () => {
    const sandbox = new ExecutionSandbox();
    const req = Object.freeze({ toolId: 't1', input: Object.freeze({}), traceId: 'tr1', timestamp: 0 });
    const result = sandbox.execute(req, () => Object.freeze({
      request: req, status: 'completed' as const, output: Object.freeze({ ok: true }),
      error: null, failureCode: null, durationMs: 0,
    }));
    expect(result.status).toBe('completed');
    expect(result.output).toEqual({ ok: true });
  });

  it('rejects when governance limits exceeded', () => {
    const sandbox = new ExecutionSandbox({ maxExecutions: 1 });
    const req = Object.freeze({ toolId: 't1', input: Object.freeze({}), traceId: 'tr1', timestamp: 0 });
    sandbox.execute(req, () => Object.freeze({
      request: req, status: 'completed' as const, output: null, error: null, failureCode: null, durationMs: 0,
    }));
    const result = sandbox.execute(req, () => Object.freeze({
      request: req, status: 'completed' as const, output: null, error: null, failureCode: null, durationMs: 0,
    }));
    expect(result.status).toBe('rejected');
    expect(result.failureCode).toBe('governance_restriction');
  });

  it('catches synchronous errors', () => {
    const sandbox = new ExecutionSandbox();
    const req = Object.freeze({ toolId: 't1', input: Object.freeze({}), traceId: 'tr1', timestamp: 0 });
    const result = sandbox.execute(req, () => { throw new Error('boom'); });
    expect(result.status).toBe('failed');
    expect(result.error).toBe('boom');
  });

  it('executes async function', async () => {
    const sandbox = new ExecutionSandbox();
    const req = Object.freeze({ toolId: 't1', input: Object.freeze({}), traceId: 'tr1', timestamp: 0 });
    const result = await sandbox.executeAsync(req, async () => Object.freeze({
      request: req, status: 'completed' as const, output: Object.freeze({ async: true }),
      error: null, failureCode: null, durationMs: 0,
    }));
    expect(result.status).toBe('completed');
    expect(result.output).toEqual({ async: true });
  });

  it('catches async errors', async () => {
    const sandbox = new ExecutionSandbox();
    const req = Object.freeze({ toolId: 't1', input: Object.freeze({}), traceId: 'tr1', timestamp: 0 });
    const result = await sandbox.executeAsync(req, async () => { throw new Error('async boom'); });
    expect(result.status).toBe('failed');
    expect(result.error).toBe('async boom');
  });
});

describe('Sandbox immutability', () => {
  it('freezes sandbox execution results', () => {
    const sandbox = new ExecutionSandbox();
    const req = Object.freeze({ toolId: 't1', input: Object.freeze({}), traceId: 'tr1', timestamp: 0 });
    const result = sandbox.execute(req, () => Object.freeze({
      request: req, status: 'completed' as const, output: Object.freeze({}),
      error: null, failureCode: null, durationMs: 0,
    }));
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.request)).toBe(true);
  });
});
