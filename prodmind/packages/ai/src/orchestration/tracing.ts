let traceCounter = 0;

function generateSpanId(): string {
  traceCounter++;
  return `span_${Date.now().toString(36)}_${traceCounter}_${Math.random().toString(36).slice(2, 6)}`;
}

export function generateTraceId(): string {
  traceCounter++;
  return `trace_${Date.now().toString(36)}_${traceCounter}`;
}

export interface TraceSpan {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly operation: string;
  readonly startTime: number;
  readonly endTime?: number;
  readonly status?: 'ok' | 'error';
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export class Tracer {
  private readonly spans: TraceSpan[];

  public constructor() {
    this.spans = [];
  }

  public startSpan(
    operation: string,
    traceId: string,
    parent?: TraceSpan,
    metadata?: Record<string, unknown>,
  ): TraceSpan {
    const span: TraceSpan = {
      traceId,
      spanId: generateSpanId(),
      parentSpanId: parent?.spanId,
      operation,
      startTime: Date.now(),
      metadata: metadata ? Object.freeze({ ...metadata }) : undefined,
    };

    this.spans.push(span);
    return span;
  }

  public endSpan(span: TraceSpan, status: 'ok' | 'error' = 'ok'): TraceSpan {
    const idx = this.spans.indexOf(span);
    if (idx === -1) return span;

    const updated: TraceSpan = {
      ...span,
      endTime: Date.now(),
      status,
    };

    this.spans[idx] = updated;
    return updated;
  }

  public getTrace(traceId: string): readonly TraceSpan[] {
    return this.spans.filter((s) => s.traceId === traceId);
  }

  public getAllSpans(): readonly TraceSpan[] {
    return [...this.spans];
  }

  public clear(): void {
    this.spans.length = 0;
  }
}
