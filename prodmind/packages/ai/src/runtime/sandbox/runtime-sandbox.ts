import { RuntimeBudgetTracker } from '../budgeting/runtime-budget.ts';
import { RuntimeCapabilityRegistry } from '../capabilities/runtime-capabilities.ts';
import type {
  RuntimeExecutionMetrics,
  RuntimeExecutionRequest,
  RuntimeExecutionResult,
  RuntimeExecutionTrace,
  RuntimeFailureRecord,
  RuntimeHealthSnapshot,
  RuntimeLifecycleEntry,
  RuntimePolicy,
} from '../contracts/runtime-contracts.ts';
import {
  createRuntimeBudget,
  createRuntimeFailureRecord,
  createRuntimePolicy,
} from '../contracts/runtime-contracts.ts';
import { RuntimeHealthMonitor } from '../health/runtime-health.ts';
import { RuntimeIsolation } from '../isolation/runtime-isolation.ts';
import { RuntimeLifecycle } from '../lifecycle/runtime-lifecycle.ts';
import { RuntimePolicyEngine } from '../policies/runtime-policy.ts';
import { RuntimeReplay } from '../replay/runtime-replay.ts';
import { RuntimeScheduler } from '../scheduling/runtime-scheduler.ts';
import { RuntimeTelemetryCollector } from '../telemetry/runtime-telemetry.ts';
import type { ValidationRule } from '../validation/runtime-validation.ts';
import { RuntimeValidationEngine } from '../validation/runtime-validation.ts';

export interface SandboxConfig {
  readonly policy?: Partial<RuntimePolicy>;
  readonly capabilities?: import('../capabilities/runtime-capabilities.ts').CapabilityDescriptor[];
  readonly validationRules?: ValidationRule[];
}

export interface SandboxResult {
  readonly result: RuntimeExecutionResult;
  readonly success: boolean;
  readonly failures: readonly RuntimeFailureRecord[];
}

export interface Sandbox {
  execute(request: RuntimeExecutionRequest, config?: SandboxConfig): Promise<SandboxResult>;
  getHealth(): RuntimeHealthSnapshot;
  getTelemetry(): readonly import('../telemetry/runtime-telemetry.ts').TelemetryPoint[];
  enableReplay(): void;
  disableReplay(): void;
}

export class RuntimeSandbox implements Sandbox {
  readonly policyEngine: RuntimePolicyEngine;
  readonly scheduler: RuntimeScheduler;
  readonly capabilities: RuntimeCapabilityRegistry;
  readonly telemetry: RuntimeTelemetryCollector;
  readonly health: RuntimeHealthMonitor;
  readonly validation: RuntimeValidationEngine;
  readonly replay: RuntimeReplay;
  readonly isolation: RuntimeIsolation;

  private readonly budget: RuntimeBudgetTracker;

  constructor(config?: SandboxConfig) {
    this.policyEngine = new RuntimePolicyEngine(config?.policy);
    this.budget = new RuntimeBudgetTracker(createRuntimePolicy(config?.policy ?? {}));
    this.scheduler = new RuntimeScheduler(createRuntimePolicy(config?.policy ?? {}));
    this.capabilities = new RuntimeCapabilityRegistry(config?.capabilities);
    this.isolation = new RuntimeIsolation(config?.policy?.isolationLevel);
    this.telemetry = new RuntimeTelemetryCollector();
    this.health = new RuntimeHealthMonitor();
    this.validation = new RuntimeValidationEngine(config?.validationRules);
    this.replay = new RuntimeReplay();
  }

  enableReplay(): void {
    this.replay.enableReplayMode();
  }

  disableReplay(): void {
    this.replay.disableReplayMode();
  }

  async execute(request: RuntimeExecutionRequest, config?: SandboxConfig): Promise<SandboxResult> {
    const lifecycle = new RuntimeLifecycle();
    const policy = config?.policy
      ? this.policyEngine.mergePolicies(this.policyEngine.getDefaultPolicy(), config.policy as Partial<RuntimePolicy>)
      : this.policyEngine.getDefaultPolicy();

    const failures: RuntimeFailureRecord[] = [];
    const lifecycleStages: RuntimeLifecycleEntry[] = [];
    const startTime = Date.now();

    try {
      lifecycle.queue();
      lifecycleStages.push(...lifecycle.getHistory());

      lifecycle.validate();
      lifecycleStages.push(...lifecycle.getHistory());

      const policyDecision = this.policyEngine.evaluate(request, config?.policy);
      if (!policyDecision.allowed) {
        const failure = createRuntimeFailureRecord({
          failureClass: 'governance_rejection',
          message: policyDecision.reasons.join('; '),
          stage: 'VALIDATED',
          code: 'POLICY_REJECTION',
          recoverable: false,
        });
        failures.push(failure);
        lifecycle.fail();
        lifecycleStages.push(...lifecycle.getHistory());
        return this.buildResult(request, policy, lifecycle, failures, lifecycleStages, startTime);
      }

      const budgetEstimate = this.budget.estimate(request);
      if (budgetEstimate.isOverBudget) {
        const failure = createRuntimeFailureRecord({
          failureClass: 'budget_overflow',
          message: `budget ${budgetEstimate.totalBudget} exceeded by ${budgetEstimate.remaining}`,
          stage: 'VALIDATED',
          code: 'BUDGET_OVERFLOW',
          recoverable: false,
        });
        failures.push(failure);
        lifecycle.fail();
        lifecycleStages.push(...lifecycle.getHistory());
        return this.buildResult(request, policy, lifecycle, failures, lifecycleStages, startTime);
      }

      const validationFailures = this.validation.validate(request);
      if (validationFailures.length > 0) {
        failures.push(...validationFailures);
        lifecycle.fail();
        lifecycleStages.push(...lifecycle.getHistory());
        return this.buildResult(request, policy, lifecycle, failures, lifecycleStages, startTime);
      }

      this.budget.consume(budgetEstimate);

      lifecycle.schedule();
      lifecycleStages.push(...lifecycle.getHistory());

      this.scheduler.enqueue(request, 0);

      lifecycle.execute();
      lifecycleStages.push(...lifecycle.getHistory());

      await this.delay(50);

      lifecycle.normalize();
      lifecycleStages.push(...lifecycle.getHistory());

      lifecycle.validating();
      lifecycleStages.push(...lifecycle.getHistory());

      lifecycle.complete();
      lifecycleStages.push(...lifecycle.getHistory());

      this.health.recordEvent(true);
    } catch (err) {
      const failure = createRuntimeFailureRecord({
        failureClass: 'unknown',
        message: err instanceof Error ? err.message : 'unknown error',
        stage: 'EXECUTING',
        code: 'RUNTIME_EXCEPTION',
        recoverable: false,
      });
      failures.push(failure);
      lifecycle.fail();
      lifecycleStages.push(...lifecycle.getHistory());
      this.health.recordEvent(false);
    } finally {
      this.scheduler.complete();
    }

    return this.buildResult(request, policy, lifecycle, failures, lifecycleStages, startTime);
  }

  private buildResult(
    request: RuntimeExecutionRequest,
    policy: RuntimePolicy,
    lifecycle: RuntimeLifecycle,
    failures: RuntimeFailureRecord[],
    lifecycleStages: RuntimeLifecycleEntry[],
    startTime: number,
  ): SandboxResult {
    const totalDurationMs = Date.now() - startTime;
    const budget = createRuntimeBudget({ promptTokens: 0, contextTokens: 0, totalBudget: policy.maxTokenBudget });
    const trace: RuntimeExecutionTrace = Object.freeze({
      executionId: request.executionId,
      lifecycleStages: Object.freeze(lifecycleStages),
      totalDurationMs,
    });
    const health = this.health.getSnapshot();
    const metrics: RuntimeExecutionMetrics = Object.freeze({
      queueWaitMs: 0,
      executionDurationMs: totalDurationMs,
      totalDurationMs,
      retriesAttempted: failures.filter(f => f.failureClass === 'retry_exhausted').length,
      policyEvaluations: 1,
      budgetUtilization: this.budget.getUtilization(),
      finalLifecycleStage: lifecycle.stage,
      failure: failures.length > 0 ? failures[0] : undefined,
    });

    const result: RuntimeExecutionResult = Object.freeze({
      request,
      response: null,
      policy,
      budget,
      trace,
      metrics,
      lifecycle: Object.freeze(lifecycleStages),
      healthSnapshot: health,
      fingerprint: `${request.executionId}-${Date.now()}`,
      generatedAt: new Date().toISOString(),
    });

    if (this.replay.isReplayMode) {
      this.replay.record(result);
    }

    this.telemetry.record({
      executionId: request.executionId,
      stage: lifecycle.stage,
      durationMs: totalDurationMs,
      success: lifecycle.stage === 'COMPLETED',
      metadata: { failures: failures.length },
    });

    return {
      result,
      success: lifecycle.stage === 'COMPLETED',
      failures: Object.freeze(failures),
    };
  }

  getHealth(): RuntimeHealthSnapshot {
    return this.health.getSnapshot();
  }

  getTelemetry(): readonly import('../telemetry/runtime-telemetry.ts').TelemetryPoint[] {
    return this.telemetry.points;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
