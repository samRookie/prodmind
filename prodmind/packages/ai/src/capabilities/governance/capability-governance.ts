import type { ToolExecutionResult } from '../contracts/tool-result.ts';
import type { CapabilityPolicy } from '../contracts/capability-policy.ts';
import { PolicyEnforcer, type EnforcementResult } from './policy-enforcer.ts';
import { AccessControl } from './access-control.ts';
import { CircuitBreaker } from './circuit-breaker.ts';
import { FailureIsolator } from './failure-isolator.ts';

export interface GovernanceReport {
  readonly allowed: boolean;
  readonly reasons: readonly string[];
  readonly enforcerResult: EnforcementResult;
  readonly accessAllowed: boolean;
  readonly circuitOpen: boolean;
  readonly isolated: boolean;
}

export class CapabilityGovernance {
  readonly enforcer: PolicyEnforcer;
  readonly accessControl: AccessControl;
  readonly circuitBreaker: CircuitBreaker;
  readonly failureIsolator: FailureIsolator;

  constructor(policy: CapabilityPolicy) {
    this.enforcer = new PolicyEnforcer(policy);
    this.accessControl = new AccessControl();
    this.circuitBreaker = new CircuitBreaker(3);
    this.failureIsolator = new FailureIsolator();
  }

  checkExecution(toolId: string, source: string): GovernanceReport {
    const enforcerResult = this.enforcer.checkToolCall();
    const accessAllowed = this.accessControl.isAllowed(toolId, source);
    const circuitOpen = this.circuitBreaker.isOpen;
    const isolated = !this.failureIsolator.isToolAvailable(toolId);

    const reasons: string[] = [];
    if (!enforcerResult.allowed) reasons.push(...enforcerResult.violations);
    if (!accessAllowed) reasons.push(`access denied for ${source}`);
    if (circuitOpen) reasons.push('circuit breaker open');
    if (isolated) reasons.push(`tool ${toolId} is isolated`);

    return Object.freeze({
      allowed: enforcerResult.allowed && accessAllowed && !circuitOpen && !isolated,
      reasons: Object.freeze(reasons),
      enforcerResult,
      accessAllowed,
      circuitOpen,
      isolated,
    });
  }

  recordExecution(toolId: string, result: ToolExecutionResult, durationMs: number): void {
    this.enforcer.recordExecution(durationMs);
    if (result.status === 'failed') {
      this.circuitBreaker.recordFailure();
    }
    this.failureIsolator.recordResult(toolId, result);
  }

  reset(): void {
    this.enforcer.reset();
    this.circuitBreaker.reset();
    this.failureIsolator.clear();
  }
}
