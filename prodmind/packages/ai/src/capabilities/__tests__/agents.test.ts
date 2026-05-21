import { describe, expect, it } from 'vitest';

import { AnalysisAgent } from '../agents/analysis-agent.ts';
import { RetrievalAgent } from '../agents/retrieval-agent.ts';
import { PlanningAgent } from '../agents/planning-agent.ts';
import { ValidationAgent } from '../agents/validation-agent.ts';
import { SynthesisAgent } from '../agents/synthesis-agent.ts';
import { DEFAULT_CAPABILITY_POLICY } from '../contracts/capability-policy.ts';

/* ------------------------------------------------------------------ */
/*  AnalysisAgent                                                        */
/* ------------------------------------------------------------------ */
describe('AnalysisAgent', () => {
  it('performs bounded analysis', () => {
    const agent = new AnalysisAgent(DEFAULT_CAPABILITY_POLICY, 3);
    const result = agent.analyze({ query: 'test', context: {}, maxTools: 5 });
    expect(result.toolCount).toBe(3);
    expect(result.findings).toHaveLength(3);
    expect(result.summary).toContain('3 analysis tool calls');
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.findings)).toBe(true);
  });

  it('caps tool calls to maxTools', () => {
    const agent = new AnalysisAgent(DEFAULT_CAPABILITY_POLICY, 2);
    const result = agent.analyze({ query: 'test', context: {}, maxTools: 10 });
    expect(result.toolCount).toBe(2);
  });

  it('resets state', () => {
    const agent = new AnalysisAgent(DEFAULT_CAPABILITY_POLICY);
    agent.analyze({ query: 'q', context: {}, maxTools: 2 });
    agent.reset();
    expect(agent.executor.session.count).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  RetrievalAgent                                                       */
/* ------------------------------------------------------------------ */
describe('RetrievalAgent', () => {
  it('performs bounded multi-hop retrieval', () => {
    const agent = new RetrievalAgent(DEFAULT_CAPABILITY_POLICY, 2);
    const results = agent.retrieve({ seedIds: ['a', 'b'], maxHops: 5 });
    expect(results).toHaveLength(2);
    expect(Object.isFrozen(results)).toBe(true);
  });

  it('caps hops to maxHops', () => {
    const agent = new RetrievalAgent(DEFAULT_CAPABILITY_POLICY, 1);
    const results = agent.retrieve({ seedIds: ['a'], maxHops: 10 });
    expect(results).toHaveLength(1);
  });

  it('resets', () => {
    const agent = new RetrievalAgent(DEFAULT_CAPABILITY_POLICY);
    agent.retrieve({ seedIds: ['a'], maxHops: 1 });
    agent.reset();
    expect(agent.executor.session.count).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  PlanningAgent                                                        */
/* ------------------------------------------------------------------ */
describe('PlanningAgent', () => {
  it('creates a deterministic plan', () => {
    const agent = new PlanningAgent(DEFAULT_CAPABILITY_POLICY);
    const plan = agent.plan('analyze deps', ['tool_a', 'tool_b', 'tool_c']);
    expect(plan.steps).toHaveLength(3);
    expect(plan.steps[0]?.toolId).toBe('tool_a');
    expect(plan.steps[1]?.dependsOn).toEqual(['step_0']);
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.steps)).toBe(true);
  });

  it('creates empty plan for no tools', () => {
    const agent = new PlanningAgent(DEFAULT_CAPABILITY_POLICY);
    const plan = agent.plan('nothing', []);
    expect(plan.steps).toHaveLength(0);
  });

  it('resets', () => {
    const agent = new PlanningAgent(DEFAULT_CAPABILITY_POLICY);
    agent.plan('x', ['t']);
    agent.reset();
    expect(agent.executor.session.count).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  ValidationAgent                                                      */
/* ------------------------------------------------------------------ */
describe('ValidationAgent', () => {
  it('reports valid when no violations', () => {
    const agent = new ValidationAgent(DEFAULT_CAPABILITY_POLICY);
    const report = agent.validate({ results: [], rules: ['rule_1'] });
    expect(report.valid).toBe(true);
    expect(report.violations).toHaveLength(0);
    expect(Object.isFrozen(report)).toBe(true);
  });

  it('detects failures', () => {
    const agent = new ValidationAgent(DEFAULT_CAPABILITY_POLICY);
    const failedResult = Object.freeze({
      request: Object.freeze({ toolId: 't1', input: Object.freeze({}), traceId: 'tr1', timestamp: 0 }),
      status: 'failed' as const, output: null,
      error: 'something broke', failureCode: 'internal_error' as const, durationMs: 0,
    });
    const report = agent.validate({ results: [failedResult], rules: ['must_pass'] });
    expect(report.valid).toBe(false);
    expect(report.violations).toHaveLength(1);
    expect(report.checkedCount).toBe(1);
  });

  it('resets', () => {
    const agent = new ValidationAgent(DEFAULT_CAPABILITY_POLICY);
    agent.validate({ results: [], rules: ['r'] });
    agent.reset();
    expect(agent.executor.session.count).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  SynthesisAgent                                                       */
/* ------------------------------------------------------------------ */
describe('SynthesisAgent', () => {
  it('synthesizes results', () => {
    const agent = new SynthesisAgent(DEFAULT_CAPABILITY_POLICY);
    const ok = Object.freeze({
      request: Object.freeze({ toolId: 't1', input: Object.freeze({}), traceId: 'tr1', timestamp: 0 }),
      status: 'completed' as const, output: Object.freeze({ data: 1 }),
      error: null, failureCode: null, durationMs: 0,
    });
    const fail = Object.freeze({
      request: Object.freeze({ toolId: 't2', input: Object.freeze({}), traceId: 'tr2', timestamp: 0 }),
      status: 'failed' as const, output: null,
      error: 'err', failureCode: 'internal_error' as const, durationMs: 0,
    });
    const output = agent.synthesize({ results: [ok, fail], objective: 'test' });
    expect(output.totalResults).toBe(2);
    expect(output.successCount).toBe(1);
    expect(output.failureCount).toBe(1);
    expect(output.data).toHaveLength(1);
    expect(Object.isFrozen(output)).toBe(true);
    expect(Object.isFrozen(output.data)).toBe(true);
  });

  it('handles empty results', () => {
    const agent = new SynthesisAgent(DEFAULT_CAPABILITY_POLICY);
    const output = agent.synthesize({ results: [], objective: 'empty' });
    expect(output.totalResults).toBe(0);
    expect(output.data).toHaveLength(0);
  });

  it('resets', () => {
    const agent = new SynthesisAgent(DEFAULT_CAPABILITY_POLICY);
    agent.synthesize({ results: [], objective: 'x' });
    agent.reset();
    expect(agent.executor.session.count).toBe(0);
  });
});
