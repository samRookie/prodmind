import type { TraceSpan } from '../../orchestration/tracing.ts';
import { Tracer } from '../../orchestration/tracing.ts';
import type { RuntimeLifecycleStage } from '../contracts/runtime-contracts.ts';

export interface RuntimeSpanMetadata {
  readonly executionId: string;
  readonly stage: RuntimeLifecycleStage;
  readonly provider?: string;
  readonly model?: string;
  readonly retryAttempt?: number;
}

export class RuntimeTracer {
  private readonly tracer: Tracer;
  private readonly executionId: string;

  constructor(executionId: string, tracer?: Tracer) {
    this.executionId = executionId;
    this.tracer = tracer ?? new Tracer();
  }

  startStage(stage: RuntimeLifecycleStage, metadata?: Record<string, unknown>): void {
    this.tracer.startSpan(`runtime:${this.executionId}:${stage}`, this.executionId, undefined, {
      stage,
      ...metadata,
    });
  }

  endStage(stage: RuntimeLifecycleStage, status: 'ok' | 'error' = 'ok'): void {
    const spans = this.tracer.getTrace(this.executionId);
    const span = spans.find(s => s.operation === `runtime:${this.executionId}:${stage}`);
    if (span) {
      this.tracer.endSpan(span, status);
    }
  }

  getTrace(): readonly TraceSpan[] {
    return this.tracer.getTrace(this.executionId);
  }

  getAllTraces(): readonly TraceSpan[] {
    return this.tracer.getAllSpans();
  }

  clear(): void {
    this.tracer.clear();
  }
}
