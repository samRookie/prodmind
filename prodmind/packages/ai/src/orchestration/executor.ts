import { generateId } from '@prodmind/db';
import { featureFlags, getLimits } from '@prodmind/core';
import type { Step, StepContext, StepExecutionRecord, StepInput, StepOutput, StepStatus, WorkflowResult, WorkflowErrorPolicy } from './types.ts';
import { createStepInput, createStepOutput, createStepExecutionRecord } from './types.ts';
import type { WorkflowGraph } from './workflow.ts';
import { WorkflowAbortedError } from './errors.ts';
import { LifecycleManager } from './lifecycle.ts';
import { Tracer, generateTraceId } from './tracing.ts';
import { CancellationScope } from './cancellation.ts';

export interface ExecutorConfig {
  readonly lifecycle?: LifecycleManager;
  readonly tracer?: Tracer;
}

export class OrchestrationExecutor {
  private readonly lifecycle: LifecycleManager;
  private readonly tracer: Tracer;
  private readonly activeWorkflows: Map<string, { scope: CancellationScope; startTime: number }>;

  public constructor(config?: ExecutorConfig) {
    this.lifecycle = config?.lifecycle ?? new LifecycleManager();
    this.tracer = config?.tracer ?? new Tracer();
    this.activeWorkflows = new Map();
  }

  public async execute<TInput, TOutput>(
    workflow: WorkflowGraph<TInput, TOutput>,
    input: TInput,
    options?: {
      workflowId?: string;
      signal?: AbortSignal;
      errorPolicy?: WorkflowErrorPolicy;
      fallbackValue?: TOutput;
    },
  ): Promise<WorkflowResult<TOutput>> {
    const workflowId = options?.workflowId ?? generateId();
    const traceId = generateTraceId();
    const executionId = generateId();
    const startTime = Date.now();
    const executionRecords: StepExecutionRecord[] = [];
    const scope = new CancellationScope(options?.signal);
    const errorPolicy = options?.errorPolicy ?? 'abort';

    this.activeWorkflows.set(workflowId, { scope, startTime });

    const workflowSpan = this.tracer.startSpan(`workflow:${workflow.name}`, traceId);

    const flags = featureFlags.snapshot();
    const limits = getLimits();

    try {
      await this.lifecycle.onWorkflowStart(workflowId, executionId, traceId, workflowSpan);

      if (scope.signal.aborted) {
        throw new WorkflowAbortedError('Workflow cancelled before execution');
      }

      const stepInput: StepInput<unknown> = createStepInput(input);
      const stepSpan = this.tracer.startSpan(`step:${workflow.name}`, traceId, workflowSpan);

      const stepContext: StepContext = {
        workflowId,
        stepId: workflow.id,
        executionId,
        traceId,
        signal: scope.signal,
        featureFlags: flags,
        limits: limits as unknown as Record<string, unknown>,
      };

      await this.lifecycle.beforeStep(
        workflowId, executionId, traceId, workflow as unknown as Step,
        stepInput, stepContext, stepSpan,
      );

      let stepStatus: StepStatus = 'completed';
      let stepError: Error | undefined;
      let stepOutput: StepOutput<unknown>;

      try {
        stepOutput = await workflow.execute(stepInput as StepInput<TInput>, stepContext);
      } catch (error) {
        stepStatus = 'failed';
        stepError = error instanceof Error ? error : new Error(String(error));

        await this.lifecycle.onStepError(
          workflowId, executionId, traceId,
          workflow.id, workflow.name, stepError, stepSpan,
        );

        if (errorPolicy === 'abort') {
          throw error;
        }

        if (errorPolicy === 'fallback' && options?.fallbackValue !== undefined) {
          stepStatus = 'completed';
          stepOutput = createStepOutput(options.fallbackValue as TOutput);
        } else {
          stepStatus = 'skipped';
          stepOutput = createStepOutput(null);
        }
      }

      const stepDuration = stepSpan.startTime ? Date.now() - stepSpan.startTime : 0;

      this.tracer.endSpan(stepSpan, stepStatus === 'completed' ? 'ok' : 'error');

      const record = createStepExecutionRecord({
        stepId: workflow.id,
        stepName: workflow.name,
        status: stepStatus,
        durationMs: stepDuration,
        traceId,
        errorCode: stepError ? (stepError as { code?: string }).code ?? stepError.name : undefined,
        errorMessage: stepError?.message,
      });

      executionRecords.push(record);

      if (stepStatus === 'completed' || stepStatus === 'skipped') {
        await this.lifecycle.afterStep(
          workflowId, executionId, traceId, workflow as unknown as Step,
          stepInput, record, stepSpan,
        );
      }

      const workflowDuration = Date.now() - startTime;

      if (stepStatus === 'completed') {
        this.tracer.endSpan(workflowSpan, 'ok');
        await this.lifecycle.onWorkflowComplete(workflowId, executionId, traceId, workflowDuration, workflowSpan);

        return {
          status: 'completed',
          output: (stepOutput?.data as TOutput) ?? null,
          executionRecords: Object.freeze(executionRecords),
          traceId,
          durationMs: workflowDuration,
        };
      }

      this.tracer.endSpan(workflowSpan, 'error');
      await this.lifecycle.onWorkflowError(
        workflowId, executionId, traceId,
        stepError ?? new Error('Workflow failed'),
        workflowDuration,
        workflowSpan,
      );

      return {
        status: 'failed',
        output: null,
        executionRecords: Object.freeze(executionRecords),
        traceId,
        durationMs: workflowDuration,
        errorCode: stepError ? (stepError as { code?: string }).code ?? stepError.name : 'UNKNOWN',
        errorMessage: stepError?.message,
      };
    } catch (error) {
      const workflowDuration = Date.now() - startTime;
      this.tracer.endSpan(workflowSpan, 'error');

      const isCancelled = error instanceof WorkflowAbortedError || (error instanceof Error && error.name === 'WorkflowAbortedError');

      if (isCancelled) {
        await this.lifecycle.onStepCancelled(
          workflowId, executionId, traceId,
          workflow.id, workflow.name,
        );
      } else {
        await this.lifecycle.onWorkflowError(
          workflowId, executionId, traceId,
          error instanceof Error ? error : new Error(String(error)),
          workflowDuration,
          workflowSpan,
        );
      }

      return {
        status: isCancelled ? 'cancelled' : 'failed',
        output: null,
        executionRecords: Object.freeze(executionRecords),
        traceId,
        durationMs: workflowDuration,
        errorCode: isCancelled ? 'WORKFLOW_ABORTED' : (error instanceof Error ? (error as { code?: string }).code ?? error.name : 'UNKNOWN'),
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    } finally {
      this.activeWorkflows.delete(workflowId);
    }
  }

  public cancel(workflowId: string, reason?: string): boolean {
    const entry = this.activeWorkflows.get(workflowId);
    if (!entry) return false;

    entry.scope.cancel(reason ?? 'Workflow cancelled by request');
    return true;
  }

  public getStatus(workflowId: string): { running: boolean; startTime?: number } | null {
    const entry = this.activeWorkflows.get(workflowId);
    if (!entry) return null;

    return {
      running: !entry.scope.isCancelled,
      startTime: entry.startTime,
    };
  }
}

export function createOrchestrationExecutor(config?: ExecutorConfig): OrchestrationExecutor {
  return new OrchestrationExecutor(config);
}
