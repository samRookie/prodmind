import type { TraceSpan } from './tracing.ts';
import type { Step, StepContext, StepExecutionRecord, StepInput,StepStatus, WorkflowStatus } from './types.ts';

export type LifecycleHook =
  | 'beforeStep'
  | 'afterStep'
  | 'onStepError'
  | 'onStepCancelled'
  | 'onWorkflowStart'
  | 'onWorkflowComplete'
  | 'onWorkflowError';

export interface LifecycleContext {
  readonly hook: LifecycleHook;
  readonly workflowId: string;
  readonly executionId: string;
  readonly traceId: string;
  readonly stepId?: string;
  readonly stepName?: string;
  readonly status?: StepStatus | WorkflowStatus;
  readonly durationMs?: number;
  readonly errorCode?: string;
  readonly errorMessage?: string;
  readonly span?: TraceSpan;
  readonly timestamp: number;
}

export interface LifecycleMiddleware {
  readonly hook: LifecycleHook;
  execute(context: LifecycleContext): Promise<void>;
}

export class LifecycleManager {
  private readonly middlewares: Map<LifecycleHook, LifecycleMiddleware[]>;

  public constructor() {
    this.middlewares = new Map();
  }

  public register(middleware: LifecycleMiddleware): void {
    const list = this.middlewares.get(middleware.hook) ?? [];
    list.push(middleware);
    this.middlewares.set(middleware.hook, list);
  }

  public registerAll(middlewares: LifecycleMiddleware[]): void {
    for (const m of middlewares) {
      this.register(m);
    }
  }

  public async emit(context: LifecycleContext): Promise<void> {
    const list = this.middlewares.get(context.hook);
    if (!list) return;

    for (const middleware of list) {
      await middleware.execute(context);
    }
  }

  public async beforeStep(
    workflowId: string,
    executionId: string,
    traceId: string,
    step: Step,
    _input: StepInput,
    _context: StepContext,
    span?: TraceSpan,
    _parentSpan?: TraceSpan,
  ): Promise<void> {
    await this.emit({
      hook: 'beforeStep',
      workflowId,
      executionId,
      traceId,
      stepId: step.id,
      stepName: step.name,
      timestamp: Date.now(),
      span,
    });
  }

  public async afterStep(
    workflowId: string,
    executionId: string,
    traceId: string,
    step: Step,
    _input: StepInput,
    record: StepExecutionRecord,
    span?: TraceSpan,
    _parentSpan?: TraceSpan,
  ): Promise<void> {
    await this.emit({
      hook: 'afterStep',
      workflowId,
      executionId,
      traceId,
      stepId: step.id,
      stepName: step.name,
      status: record.status,
      durationMs: record.durationMs,
      timestamp: Date.now(),
      span,
    });
  }

  public async onStepError(
    workflowId: string,
    executionId: string,
    traceId: string,
    stepId: string,
    stepName: string,
    error: Error,
    span?: TraceSpan,
  ): Promise<void> {
    await this.emit({
      hook: 'onStepError',
      workflowId,
      executionId,
      traceId,
      stepId,
      stepName,
      status: 'failed',
      errorCode: (error as { code?: string }).code ?? error.name,
      errorMessage: error.message,
      timestamp: Date.now(),
      span,
    });
  }

  public async onStepCancelled(
    workflowId: string,
    executionId: string,
    traceId: string,
    stepId: string,
    stepName: string,
    span?: TraceSpan,
  ): Promise<void> {
    await this.emit({
      hook: 'onStepCancelled',
      workflowId,
      executionId,
      traceId,
      stepId,
      stepName,
      status: 'cancelled',
      timestamp: Date.now(),
      span,
    });
  }

  public async onWorkflowStart(
    workflowId: string,
    executionId: string,
    traceId: string,
    span?: TraceSpan,
  ): Promise<void> {
    await this.emit({
      hook: 'onWorkflowStart',
      workflowId,
      executionId,
      traceId,
      status: 'running',
      timestamp: Date.now(),
      span,
    });
  }

  public async onWorkflowComplete(
    workflowId: string,
    executionId: string,
    traceId: string,
    durationMs: number,
    span?: TraceSpan,
  ): Promise<void> {
    await this.emit({
      hook: 'onWorkflowComplete',
      workflowId,
      executionId,
      traceId,
      status: 'completed',
      durationMs,
      timestamp: Date.now(),
      span,
    });
  }

  public async onWorkflowError(
    workflowId: string,
    executionId: string,
    traceId: string,
    error: Error,
    durationMs: number,
    span?: TraceSpan,
  ): Promise<void> {
    await this.emit({
      hook: 'onWorkflowError',
      workflowId,
      executionId,
      traceId,
      status: 'failed',
      errorCode: (error as { code?: string }).code ?? error.name,
      errorMessage: error.message,
      durationMs,
      timestamp: Date.now(),
      span,
    });
  }

  public clear(): void {
    this.middlewares.clear();
  }
}
