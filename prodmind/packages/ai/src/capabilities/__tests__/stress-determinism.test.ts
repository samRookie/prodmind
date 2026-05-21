import { describe, expect, it } from 'vitest';

import { DEFAULT_CAPABILITY_POLICY } from '../contracts/capability-policy.ts';
import { ToolRegistry } from '../registry/tool-registry.ts';
import { ToolExecutor } from '../execution/tool-executor.ts';
import { WorkflowEngine } from '../workflows/workflow-engine.ts';
import { ReplaySession } from '../replay/replay-session.ts';
import { ProvenanceTracker } from '../provenance/provenance-tracker.ts';
import { CapabilityEventBus } from '../events/event-system.ts';
import { PolicyEnforcer } from '../governance/policy-enforcer.ts';
import { CircuitBreaker } from '../governance/circuit-breaker.ts';
import { CapabilitiesOrchestrator } from '../integration/capabilities-orchestrator.ts';
import { CapabilityMemoryBridge } from '../integration/capability-memory-bridge.ts';

/* ------------------------------------------------------------------ */
/*  Determinism: same pipeline, identical outputs                       */
/* ------------------------------------------------------------------ */
describe('determinism: pipeline', () => {
  it('two ToolExecutors produce identical results', () => {
    const a = new ToolExecutor(DEFAULT_CAPABILITY_POLICY);
    const b = new ToolExecutor(DEFAULT_CAPABILITY_POLICY);
    const ra = a.execute('t1', { x: 1 }, 'tr1');
    const rb = b.execute('t1', { x: 1 }, 'tr1');
    expect(ra.status).toBe(rb.status);
    expect(ra.request.toolId).toBe(rb.request.toolId);
    expect(ra.request.input).toEqual(rb.request.input);
  });

  it('same ProvenanceTracker entries match', () => {
    const a = new ProvenanceTracker();
    const b = new ProvenanceTracker();
    a.addEntry('tr1', 'analysis', 't1');
    b.addEntry('tr1', 'analysis', 't1');
    a.addEntry('tr2', 'validation', 't2', 'tr1');
    b.addEntry('tr2', 'validation', 't2', 'tr1');
    expect(a.getChain('tr2')).toHaveLength(b.getChain('tr2').length);
  });

  it('same events emitted in order', () => {
    const a = new CapabilityEventBus();
    const b = new CapabilityEventBus();
    const eventsA: string[] = [];
    const eventsB: string[] = [];
    a.on('tool:before', e => eventsA.push(e.type));
    b.on('tool:before', e => eventsB.push(e.type));
    a.emit('tool:before', { id: '1' });
    a.emit('tool:before', { id: '2' });
    b.emit('tool:before', { id: '1' });
    b.emit('tool:before', { id: '2' });
    expect(eventsA).toEqual(eventsB);
  });
});

/* ------------------------------------------------------------------ */
/*  Immutability: all critical outputs are frozen                       */
/* ------------------------------------------------------------------ */
describe('immutability', () => {
  it('ToolRegistry manifest is frozen', () => {
    const reg = new ToolRegistry();
    const manifest = reg.getManifest();
    expect(Object.isFrozen(manifest)).toBe(true);
    expect(Object.isFrozen(manifest.tools)).toBe(true);
  });

  it('ToolExecutionResult is frozen', () => {
    const exec = new ToolExecutor(DEFAULT_CAPABILITY_POLICY);
    const result = exec.execute('t', {}, 'tr');
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.request)).toBe(true);
    expect(Object.isFrozen(result.request.input)).toBe(true);
  });

  it('WorkflowEngine result is frozen', () => {
    const engine = new WorkflowEngine(DEFAULT_CAPABILITY_POLICY);
    engine.addNode('a', 't', {});
    const result = engine.run('tr');
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('ReplaySession steps are frozen', () => {
    const rs = new ReplaySession();
    rs.record(Object.freeze({
      request: Object.freeze({ toolId: 't', input: Object.freeze({}), traceId: 'tr', timestamp: 0 }),
      status: 'completed' as const, output: Object.freeze({}),
      error: null, failureCode: null, durationMs: 0,
    }));
    expect(Object.isFrozen(rs.steps)).toBe(true);
    expect(Object.isFrozen(rs.steps[0]!)).toBe(true);
  });

  it('ProvenanceTracker entries are frozen', () => {
    const pt = new ProvenanceTracker();
    pt.addEntry('tr', 'src', 't');
    expect(Object.isFrozen(pt.getEntry('tr')!)).toBe(true);
  });

  it('CapabilityEventBus events are frozen', () => {
    const bus = new CapabilityEventBus();
    const captured: unknown[] = [];
    bus.on('tool:before', e => captured.push(e));
    bus.emit('tool:before', { toolId: 't' });
    expect(Object.isFrozen(captured[0])).toBe(true);
  });

  it('PolicyEnforcer enforcement results are frozen', () => {
    const enforcer = new PolicyEnforcer(DEFAULT_CAPABILITY_POLICY);
    expect(Object.isFrozen(enforcer.checkToolCall())).toBe(true);
    expect(Object.isFrozen(enforcer.checkDuration())).toBe(true);
  });

  it('CapabilitiesOrchestrator result is frozen', () => {
    const co = new CapabilitiesOrchestrator();
    const result = co.executeTool('t', {}, 'tr');
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('CapabilityMemoryBridge replay results are frozen', () => {
    const mb = new CapabilityMemoryBridge();
    const result = Object.freeze({
      request: Object.freeze({ toolId: 't', input: Object.freeze({}), traceId: 'tr', timestamp: 0 }),
      status: 'failed' as const, output: null,
      error: 'err', failureCode: 'internal_error' as const, durationMs: 0,
    });
    mb.recordExecution(result, 'src');
    const replay = mb.getReplayResults();
    expect(Object.isFrozen(replay)).toBe(true);
    expect(Object.isFrozen(replay[0]!)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Stress: large scale operations                                      */
/* ------------------------------------------------------------------ */
describe('stress', () => {
  it('handles 100 tool calls sequentially', () => {
    const exec = new ToolExecutor(DEFAULT_CAPABILITY_POLICY);
    for (let i = 0; i < 100; i++) {
      exec.execute(`t${i}`, { i }, `tr${i}`);
    }
    expect(exec.session.count).toBe(100);
  });

  it('handles 50-node workflow', () => {
    const engine = new WorkflowEngine(DEFAULT_CAPABILITY_POLICY);
    for (let i = 0; i < 50; i++) {
      engine.addNode(`n${i}`, `t${i}`, {});
    }
    expect(engine.graph.count).toBe(50);
  });

  it('handles 1000 provenance entries', () => {
    const pt = new ProvenanceTracker();
    for (let i = 0; i < 1000; i++) {
      pt.addEntry(`tr${i}`, 'test', `t${i}`, i > 0 ? `tr${i - 1}` : undefined);
    }
    expect(pt.entries.size).toBe(1000);
  });

  it('handles 100 event listeners', () => {
    const bus = new CapabilityEventBus();
    for (let i = 0; i < 100; i++) {
      bus.on('tool:before', () => { });
    }
    expect(bus.listenerCount('tool:before')).toBe(100);
  });

  it('handles 500 replay records', () => {
    const rs = new ReplaySession();
    for (let i = 0; i < 500; i++) {
      rs.record(Object.freeze({
        request: Object.freeze({ toolId: `t${i}`, input: Object.freeze({}), traceId: `tr${i}`, timestamp: 0 }),
        status: 'completed' as const, output: Object.freeze({}),
        error: null, failureCode: null, durationMs: 0,
      }));
    }
    expect(rs.count).toBe(500);
  });

  it('CircuitBreaker handles 1000 failures', () => {
    const cb = new CircuitBreaker(500);
    for (let i = 0; i < 1000; i++) {
      cb.recordFailure();
    }
    expect(cb.isOpen).toBe(true);
    expect(cb.failureCount).toBe(1000);
  });

  it('ToolRegistry handles 100 registrations', () => {
    const reg = new ToolRegistry();
    for (let i = 0; i < 100; i++) {
      reg.register(`t${i}`, `Tool ${i}`, { p: true });
    }
    expect(reg.count).toBe(100);
  });
});

/* ------------------------------------------------------------------ */
/*  Edge cases                                                          */
/* ------------------------------------------------------------------ */
describe('edge cases', () => {
  it('empty WorkflowEngine run succeeds', () => {
    const engine = new WorkflowEngine(DEFAULT_CAPABILITY_POLICY);
    const result = engine.run('empty');
    expect(result.success).toBe(true);
    expect(result.resultCount).toBe(0);
  });

  it('empty ReplaySession replay returns empty', () => {
    const rs = new ReplaySession();
    expect(rs.replay()).toHaveLength(0);
  });

  it('empty ProvenanceTracker chain returns empty', () => {
    const pt = new ProvenanceTracker();
    expect(pt.getChain('nonexistent')).toHaveLength(0);
  });

  it('CapabilityEventBus emit with no listeners does not throw', () => {
    const bus = new CapabilityEventBus();
    expect(() => bus.emit('tool:before', {})).not.toThrow();
  });

  it('zero-capacity CircuitBreaker opens immediately', () => {
    const cb = new CircuitBreaker(0);
    expect(cb.isOpen).toBe(true);
  });

  it('removing non-existent listener does not throw', () => {
    const bus = new CapabilityEventBus();
    expect(() => bus.off('tool:before', () => { })).not.toThrow();
  });

  it('unregistering non-existent tool from AccessControl does not throw', () => {
    const reg = new ToolRegistry();
    reg.unregister('nonexistent');
    expect(reg.count).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  Idempotency: reset → re-run produces consistent state              */
/* ------------------------------------------------------------------ */
describe('idempotency', () => {
  it('ToolExecutor reset and re-execute works', () => {
    const exec = new ToolExecutor(DEFAULT_CAPABILITY_POLICY);
    exec.execute('t', {}, 'tr1');
    exec.reset();
    exec.execute('t', {}, 'tr2');
    expect(exec.session.count).toBe(1);
  });

  it('WorkflowEngine reset and re-run works', () => {
    const engine = new WorkflowEngine(DEFAULT_CAPABILITY_POLICY);
    engine.addNode('a', 't', {});
    engine.run('r1');
    engine.reset();
    engine.addNode('a', 't', {});
    const result = engine.run('r2');
    expect(result.success).toBe(true);
    expect(result.resultCount).toBe(1);
  });

  it('ProvenanceTracker clear and re-add works', () => {
    const pt = new ProvenanceTracker();
    pt.addEntry('tr', 'src', 't');
    pt.clear();
    pt.addEntry('tr', 'src', 't');
    expect(pt.getEntry('tr')?.source).toBe('src');
  });

  it('ReplaySession clear and re-record works', () => {
    const rs = new ReplaySession();
    const r = Object.freeze({
      request: Object.freeze({ toolId: 't', input: Object.freeze({}), traceId: 'tr', timestamp: 0 }),
      status: 'completed' as const, output: Object.freeze({}),
      error: null, failureCode: null, durationMs: 0,
    });
    rs.record(r);
    rs.clear();
    rs.record(r);
    expect(rs.count).toBe(1);
  });

  it('CapabilityMemoryBridge clear and re-record works', () => {
    const mb = new CapabilityMemoryBridge();
    const r = Object.freeze({
      request: Object.freeze({ toolId: 't', input: Object.freeze({}), traceId: 'tr', timestamp: 0 }),
      status: 'failed' as const, output: null,
      error: 'e', failureCode: 'internal_error' as const, durationMs: 0,
    });
    mb.recordExecution(r, 'src');
    mb.clear();
    mb.recordExecution(r, 'src');
    expect(mb.executionCount).toBe(1);
  });

  it('PolicyEnforcer reset allows new executions', () => {
    const enforcer = new PolicyEnforcer({ ...DEFAULT_CAPABILITY_POLICY, maxToolCalls: 1 });
    enforcer.recordExecution(1);
    expect(enforcer.checkToolCall().allowed).toBe(false);
    enforcer.reset();
    expect(enforcer.checkToolCall().allowed).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Multi-component integration determinism                             */
/* ------------------------------------------------------------------ */
describe('full pipeline determinism', () => {
  it('two identical orchestrators produce same execution results', () => {
    const a = new CapabilitiesOrchestrator({ policy: DEFAULT_CAPABILITY_POLICY });
    const b = new CapabilitiesOrchestrator({ policy: DEFAULT_CAPABILITY_POLICY });
    const ra = a.executeTool('t', { val: 1 }, 'trace');
    const rb = b.executeTool('t', { val: 1 }, 'trace');
    expect(ra.status).toBe(rb.status);
    expect(ra.request.traceId).toBe(rb.request.traceId);
  });

  it('two identical memory bridges produce same provenance', () => {
    const a = new CapabilityMemoryBridge();
    const b = new CapabilityMemoryBridge();
    const r = Object.freeze({
      request: Object.freeze({ toolId: 't', input: Object.freeze({}), traceId: 'tr', timestamp: 0 }),
      status: 'completed' as const, output: Object.freeze({}),
      error: null, failureCode: null, durationMs: 0,
    });
    a.recordExecution(r, 'analysis');
    b.recordExecution(r, 'analysis');
    expect(a.executionCount).toBe(b.executionCount);
    expect(a.getReplayResults()).toHaveLength(b.getReplayResults().length);
  });

  it('Provenance chains are deterministic across instances', () => {
    const a = new ProvenanceTracker();
    const b = new ProvenanceTracker();
    a.addEntry('tr1', 'src', 't1');
    a.addEntry('tr2', 'src', 't2', 'tr1');
    b.addEntry('tr1', 'src', 't1');
    b.addEntry('tr2', 'src', 't2', 'tr1');
    expect(a.getChain('tr2').map(e => e.traceId)).toEqual(b.getChain('tr2').map(e => e.traceId));
  });
});
