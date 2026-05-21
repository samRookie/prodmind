import { describe, expect, it } from 'vitest';

import { DEFAULT_CAPABILITY_POLICY, type CapabilityPolicy } from '../contracts/capability-policy.ts';
import { PolicyEnforcer } from '../governance/policy-enforcer.ts';
import { AccessControl } from '../governance/access-control.ts';
import { CircuitBreaker } from '../governance/circuit-breaker.ts';
import { FailureIsolator } from '../governance/failure-isolator.ts';
import type { ToolExecutionResult } from '../contracts/tool-result.ts';

function makeResult(toolId: string, status: 'completed' | 'failed' = 'completed'): ToolExecutionResult {
  return Object.freeze({
    request: Object.freeze({
      toolId, input: Object.freeze({}), traceId: `${toolId}_tr`, timestamp: 0,
    }),
    status, output: status === 'completed' ? Object.freeze({}) : null,
    error: status === 'failed' ? 'err' : null,
    failureCode: status === 'failed' ? 'internal_error' as const : null,
    durationMs: 1,
  });
}

/* ------------------------------------------------------------------ */
/*  PolicyEnforcer                                                      */
/* ------------------------------------------------------------------ */
describe('PolicyEnforcer', () => {
  it('allows tool calls within limits', () => {
    const policy: CapabilityPolicy = { ...DEFAULT_CAPABILITY_POLICY, maxToolCalls: 5 };
    const enforcer = new PolicyEnforcer(policy);
    const result = enforcer.checkToolCall();
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeNull();
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('blocks tool calls exceeding maxToolCalls', () => {
    const policy: CapabilityPolicy = { ...DEFAULT_CAPABILITY_POLICY, maxToolCalls: 2 };
    const enforcer = new PolicyEnforcer(policy);
    enforcer.recordExecution(1);
    enforcer.recordExecution(1);
    const result = enforcer.checkToolCall();
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('max tool calls');
  });

  it('checks duration', () => {
    const policy: CapabilityPolicy = { ...DEFAULT_CAPABILITY_POLICY, maxDurationMs: 100 };
    const enforcer = new PolicyEnforcer(policy);
    enforcer.recordExecution(60);
    expect(enforcer.checkDuration().allowed).toBe(true);
    enforcer.recordExecution(60);
    expect(enforcer.checkDuration().allowed).toBe(false);
  });

  it('checks result failure when disallowed', () => {
    const policy: CapabilityPolicy = { ...DEFAULT_CAPABILITY_POLICY, allowFailure: false };
    const enforcer = new PolicyEnforcer(policy);
    const result = enforcer.checkResult(makeResult('t', 'failed'));
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('failures not allowed');
  });

  it('allows failure when policy permits', () => {
    const policy: CapabilityPolicy = { ...DEFAULT_CAPABILITY_POLICY, allowFailure: true };
    const enforcer = new PolicyEnforcer(policy);
    expect(enforcer.checkResult(makeResult('t', 'failed')).allowed).toBe(true);
  });

  it('resets counters', () => {
    const policy: CapabilityPolicy = { ...DEFAULT_CAPABILITY_POLICY, maxToolCalls: 1 };
    const enforcer = new PolicyEnforcer(policy);
    enforcer.recordExecution(1);
    enforcer.reset();
    expect(enforcer.checkToolCall().allowed).toBe(true);
  });

  it('freezes enforcement results', () => {
    const enforcer = new PolicyEnforcer(DEFAULT_CAPABILITY_POLICY);
    const result = enforcer.checkToolCall();
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.violations)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  AccessControl                                                       */
/* ------------------------------------------------------------------ */
describe('AccessControl', () => {
  it('allows by default when no rule exists', () => {
    const ac = new AccessControl();
    expect(ac.isAllowed('unknown_tool', 'any')).toBe(true);
  });

  it('enforces allowed sources', () => {
    const ac = new AccessControl();
    ac.addRule('tool_a', ['analysis']);
    expect(ac.isAllowed('tool_a', 'analysis')).toBe(true);
    expect(ac.isAllowed('tool_a', 'validation')).toBe(false);
  });

  it('removes rules', () => {
    const ac = new AccessControl();
    ac.addRule('t', ['a']);
    ac.removeRule('t');
    expect(ac.isAllowed('t', 'b')).toBe(true);
  });

  it('clears all rules', () => {
    const ac = new AccessControl();
    ac.addRule('t', ['a']);
    ac.clear();
    expect(ac.isAllowed('t', 'b')).toBe(true);
  });

  it('freezes rules', () => {
    const ac = new AccessControl();
    ac.addRule('t', ['a']);
    const rule = ac.getRule('t')!;
    expect(Object.isFrozen(rule)).toBe(true);
    expect(Object.isFrozen(rule.allowedSources)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  CircuitBreaker                                                      */
/* ------------------------------------------------------------------ */
describe('CircuitBreaker', () => {
  it('starts closed', () => {
    const cb = new CircuitBreaker(3);
    expect(cb.isOpen).toBe(false);
    expect(cb.failureCount).toBe(0);
  });

  it('opens after threshold failures', () => {
    const cb = new CircuitBreaker(2);
    cb.recordFailure();
    expect(cb.isOpen).toBe(false);
    cb.recordFailure();
    expect(cb.isOpen).toBe(true);
  });

  it('closes on success', () => {
    const cb = new CircuitBreaker(2);
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.isOpen).toBe(true);
    cb.recordSuccess();
    expect(cb.isOpen).toBe(false);
    expect(cb.failureCount).toBe(0);
  });

  it('resets', () => {
    const cb = new CircuitBreaker(1);
    cb.recordFailure();
    cb.reset();
    expect(cb.isOpen).toBe(false);
    expect(cb.failureCount).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  FailureIsolator                                                     */
/* ------------------------------------------------------------------ */
describe('FailureIsolator', () => {
  it('allows unregistered tools', () => {
    const fi = new FailureIsolator();
    expect(fi.isToolAvailable('unknown')).toBe(true);
  });

  it('isolates failing tools', () => {
    const fi = new FailureIsolator();
    fi.registerTool('brittle_tool', 2);
    expect(fi.isToolAvailable('brittle_tool')).toBe(true);
    fi.recordResult('brittle_tool', makeResult('brittle_tool', 'failed'));
    expect(fi.isToolAvailable('brittle_tool')).toBe(true);
    fi.recordResult('brittle_tool', makeResult('brittle_tool', 'failed'));
    expect(fi.isToolAvailable('brittle_tool')).toBe(false);
  });

  it('recovers on success', () => {
    const fi = new FailureIsolator();
    fi.registerTool('t', 2);
    fi.recordResult('t', makeResult('t', 'failed'));
    fi.recordResult('t', makeResult('t', 'failed'));
    expect(fi.isToolAvailable('t')).toBe(false);
    fi.recordResult('t', makeResult('t', 'completed'));
    expect(fi.isToolAvailable('t')).toBe(true);
  });

  it('tracks failure count', () => {
    const fi = new FailureIsolator();
    fi.registerTool('t', 3);
    fi.recordResult('t', makeResult('t', 'failed'));
    expect(fi.getFailureCount('t')).toBe(1);
  });

  it('clears all', () => {
    const fi = new FailureIsolator();
    fi.registerTool('t', 3);
    fi.recordResult('t', makeResult('t', 'failed'));
    fi.clear();
    expect(fi.getFailureCount('t')).toBe(0);
  });
});
