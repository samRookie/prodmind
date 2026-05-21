import { describe, expect, it } from 'vitest';

import {
  TOOL_CATEGORIES,
  AGENT_CATEGORIES,
  DEFAULT_CAPABILITY_POLICY,
} from '../contracts/index.ts';
import type { ToolContract } from '../contracts/tool-contract.ts';
import type { ToolExecutionRequest, ToolExecutionResult } from '../contracts/tool-result.ts';
import type { CapabilityPolicy } from '../contracts/capability-policy.ts';
import type { CapabilityContext } from '../contracts/capability-context.ts';
import type { ExecutionCapability } from '../contracts/execution-capability.ts';
import type { AgentContract } from '../contracts/agent-contract.ts';
import type { WorkflowContract } from '../contracts/workflow-contract.ts';

/* ------------------------------------------------------------------ */
/*  ToolContract                                                        */
/* ------------------------------------------------------------------ */
describe('ToolContract', () => {
  it('creates a valid tool contract', () => {
    const tc: ToolContract = Object.freeze({
      id: 'tool_1',
      name: 'parse-graph',
      category: 'parser',
      version: '1.0.0',
      description: 'Parses dependency graphs',
      timeoutMs: 5000,
      deterministic: true,
      schema: Object.freeze({ input: 'string' }),
      dependencies: Object.freeze([]),
    });
    expect(tc.name).toBe('parse-graph');
    expect(tc.category).toBe('parser');
    expect(tc.deterministic).toBe(true);
    expect(Object.isFrozen(tc)).toBe(true);
    expect(Object.isFrozen(tc.schema)).toBe(true);
    expect(Object.isFrozen(tc.dependencies)).toBe(true);
  });

  it('supports all tool categories', () => {
    expect(TOOL_CATEGORIES).toHaveLength(9);
    expect(TOOL_CATEGORIES).toContain('parser');
    expect(TOOL_CATEGORIES).toContain('analysis');
    expect(Object.isFrozen(TOOL_CATEGORIES)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  ToolExecutionRequest / Result                                        */
/* ------------------------------------------------------------------ */
describe('ToolExecutionRequest', () => {
  it('creates a frozen request', () => {
    const req: ToolExecutionRequest = Object.freeze({
      toolId: 'tool_1',
      input: Object.freeze({ query: 'test' }),
      traceId: 'trace_1',
      timestamp: 1000,
    });
    expect(req.toolId).toBe('tool_1');
    expect(req.input).toEqual({ query: 'test' });
    expect(Object.isFrozen(req)).toBe(true);
    expect(Object.isFrozen(req.input)).toBe(true);
  });
});

describe('ToolExecutionResult', () => {
  it('creates a frozen result', () => {
    const res: ToolExecutionResult = Object.freeze({
      request: Object.freeze({
        toolId: 't1', input: Object.freeze({}), traceId: 'tr1', timestamp: 0,
      }),
      status: 'completed',
      output: Object.freeze({ data: 'ok' }),
      error: null,
      failureCode: null,
      durationMs: 10,
    });
    expect(res.status).toBe('completed');
    expect(res.output).toEqual({ data: 'ok' });
    expect(Object.isFrozen(res)).toBe(true);
    expect(Object.isFrozen(res.request)).toBe(true);
    expect(Object.isFrozen(res.output)).toBe(true);
  });

  it('supports failure status', () => {
    const res: ToolExecutionResult = Object.freeze({
      request: Object.freeze({
        toolId: 't1', input: Object.freeze({}), traceId: 'tr1', timestamp: 0,
      }),
      status: 'rejected',
      output: null,
      error: 'policy violation',
      failureCode: 'policy_rejection',
      durationMs: 0,
    });
    expect(res.status).toBe('rejected');
    expect(res.failureCode).toBe('policy_rejection');
    expect(res.output).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  CapabilityPolicy                                                     */
/* ------------------------------------------------------------------ */
describe('CapabilityPolicy', () => {
  it('creates a valid policy', () => {
    const p: CapabilityPolicy = Object.freeze({
      maxExecutionDepth: 3,
      maxToolCalls: 10,
      maxConcurrency: 2,
      allowedCategories: Object.freeze(['retrieval']),
      maxTokens: 5000,
      maxDurationMs: 15000,
      enforceDeterminism: true,
      requireProvenance: false,
    });
    expect(p.maxExecutionDepth).toBe(3);
    expect(p.maxToolCalls).toBe(10);
    expect(p.maxTokens).toBe(5000);
    expect(Object.isFrozen(p)).toBe(true);
    expect(Object.isFrozen(p.allowedCategories)).toBe(true);
  });

  it('provides default policy', () => {
    expect(DEFAULT_CAPABILITY_POLICY.maxExecutionDepth).toBe(5);
    expect(DEFAULT_CAPABILITY_POLICY.maxConcurrency).toBe(3);
    expect(DEFAULT_CAPABILITY_POLICY.maxDurationMs).toBe(30000);
    expect(DEFAULT_CAPABILITY_POLICY.enforceDeterminism).toBe(true);
    expect(Object.isFrozen(DEFAULT_CAPABILITY_POLICY)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  CapabilityContext                                                    */
/* ------------------------------------------------------------------ */
describe('CapabilityContext', () => {
  it('creates a context with parent', () => {
    const ctx: CapabilityContext = Object.freeze({
      traceId: 'tr_1',
      depth: 1,
      parentContextId: 'tr_0',
      policyOverride: null,
    });
    expect(ctx.traceId).toBe('tr_1');
    expect(ctx.depth).toBe(1);
    expect(ctx.parentContextId).toBe('tr_0');
    expect(Object.isFrozen(ctx)).toBe(true);
  });

  it('creates a root context', () => {
    const ctx: CapabilityContext = Object.freeze({
      traceId: 'tr_root',
      depth: 0,
      parentContextId: null,
      policyOverride: Object.freeze({ maxTokens: 2000 }),
    });
    expect(ctx.parentContextId).toBeNull();
    expect(ctx.policyOverride).toEqual({ maxTokens: 2000 });
    expect(Object.isFrozen(ctx.policyOverride)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  ExecutionCapability                                                  */
/* ------------------------------------------------------------------ */
describe('ExecutionCapability', () => {
  it('creates a valid capability', () => {
    const cap: ExecutionCapability = Object.freeze({
      id: 'cap_1',
      name: 'graph-parser',
      category: 'parser',
      version: '1.0.0',
      status: 'enabled',
      policy: DEFAULT_CAPABILITY_POLICY,
      dependencies: Object.freeze([]),
    });
    expect(cap.name).toBe('graph-parser');
    expect(cap.category).toBe('parser');
    expect(cap.status).toBe('enabled');
    expect(Object.isFrozen(cap)).toBe(true);
    expect(Object.isFrozen(cap.dependencies)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  AgentContract                                                        */
/* ------------------------------------------------------------------ */
describe('AgentContract', () => {
  it('creates a valid agent contract', () => {
    const ac: AgentContract = Object.freeze({
      id: 'agent_1',
      name: 'analysis-agent',
      category: 'analysis',
      version: '1.0.0',
      maxToolCalls: 5,
      maxDepth: 3,
      allowedTools: Object.freeze(['tool_1', 'tool_2']),
      enforceGovernance: true,
    });
    expect(ac.name).toBe('analysis-agent');
    expect(ac.category).toBe('analysis');
    expect(ac.maxToolCalls).toBe(5);
    expect(Object.isFrozen(ac)).toBe(true);
    expect(Object.isFrozen(ac.allowedTools)).toBe(true);
  });

  it('supports all agent categories', () => {
    expect(AGENT_CATEGORIES).toHaveLength(5);
    expect(AGENT_CATEGORIES).toContain('analysis');
    expect(AGENT_CATEGORIES).toContain('synthesis');
    expect(Object.isFrozen(AGENT_CATEGORIES)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  WorkflowContract                                                     */
/* ------------------------------------------------------------------ */
describe('WorkflowContract', () => {
  it('creates a valid workflow contract', () => {
    const wc: WorkflowContract = Object.freeze({
      id: 'wf_1',
      name: 'analysis-workflow',
      version: '1.0.0',
      maxStages: 5,
      maxTools: 50,
      timeoutMs: 60000,
      requireDeterminism: true,
    });
    expect(wc.name).toBe('analysis-workflow');
    expect(wc.maxStages).toBe(5);
    expect(wc.maxTools).toBe(50);
    expect(wc.requireDeterminism).toBe(true);
    expect(Object.isFrozen(wc)).toBe(true);
  });
});
