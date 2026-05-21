import { describe, expect, it } from 'vitest';

import { CapabilitiesOrchestrator } from '../integration/capabilities-orchestrator.ts';
import { CapabilityMemoryBridge } from '../integration/capability-memory-bridge.ts';

/* ------------------------------------------------------------------ */
/*  CapabilitiesOrchestrator                                            */
/* ------------------------------------------------------------------ */
describe('CapabilitiesOrchestrator', () => {
  it('creates with defaults', () => {
    const co = new CapabilitiesOrchestrator();
    expect(co.maxParallel).toBe(3);
    expect(co.workflow.state.status).toBe('pending');
  });

  it('executes a tool and emits events', () => {
    const co = new CapabilitiesOrchestrator();
    const events: string[] = [];
    co.on('tool:before', e => events.push('before'));
    co.on('tool:after', e => events.push('after'));
    const result = co.executeTool('tool_a', { x: 1 }, 'tr1');
    expect(result.request.toolId).toBe('tool_a');
    expect(result.status).toBe('failed'); // no handler registered
    expect(events).toEqual(['before', 'after']);
  });

  it('runs a workflow', () => {
    const co = new CapabilitiesOrchestrator();
    co.workflow.addNode('a', 'tool_a', {});
    co.workflow.addNode('b', 'tool_b', {}, ['a']);
    const result = co.runWorkflow('wf');
    expect(result.success).toBe(true);
    expect(result.resultCount).toBe(2);
  });

  it('resets state', () => {
    const co = new CapabilitiesOrchestrator();
    co.executeTool('t', {}, 'tr');
    co.reset();
    expect(co.enforcer.checkToolCall().allowed).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  CapabilityMemoryBridge                                              */
/* ------------------------------------------------------------------ */
describe('CapabilityMemoryBridge', () => {
  it('starts empty', () => {
    const mb = new CapabilityMemoryBridge();
    expect(mb.executionCount).toBe(0);
    expect(mb.getReplayResults()).toHaveLength(0);
  });

  it('records execution and provenance', () => {
    const mb = new CapabilityMemoryBridge();
    const result = {
      request: Object.freeze({
        toolId: 't1', input: Object.freeze({}), traceId: 'tr1', timestamp: 0,
      }),
      status: 'completed' as const,
      output: Object.freeze({}),
      error: null,
      failureCode: null,
      durationMs: 1,
    };
    mb.recordExecution(result, 'analysis');
    expect(mb.executionCount).toBe(1);
    expect(mb.getReplayResults()).toHaveLength(1);
    expect(mb.getProvenance('tr1')?.source).toBe('analysis');
  });

  it('builds provenance chain', () => {
    const mb = new CapabilityMemoryBridge();
    const r1 = { request: Object.freeze({ toolId: 'a', input: Object.freeze({}), traceId: 'tr1', timestamp: 0 }), status: 'completed' as const, output: Object.freeze({}), error: null, failureCode: null, durationMs: 1 };
    const r2 = { request: Object.freeze({ toolId: 'b', input: Object.freeze({}), traceId: 'tr2', timestamp: 0 }), status: 'completed' as const, output: Object.freeze({}), error: null, failureCode: null, durationMs: 1 };
    mb.recordExecution(r1, 'analysis');
    mb.recordExecution(r2, 'validation', 'tr1');
    const chain = mb.getChain('tr2');
    expect(chain).toHaveLength(2);
    expect(chain[0]?.traceId).toBe('tr2');
    expect(chain[1]?.traceId).toBe('tr1');
  });

  it('clears', () => {
    const mb = new CapabilityMemoryBridge();
    const result = { request: Object.freeze({ toolId: 't', input: Object.freeze({}), traceId: 'tr', timestamp: 0 }), status: 'completed' as const, output: Object.freeze({}), error: null, failureCode: null, durationMs: 1 };
    mb.recordExecution(result, 'src');
    mb.clear();
    expect(mb.executionCount).toBe(0);
    expect(mb.getReplayResults()).toHaveLength(0);
  });
});
