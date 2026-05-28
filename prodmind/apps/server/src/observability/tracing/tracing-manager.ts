import { createHash } from 'node:crypto';

export interface TraceSpan {
  id: string;
  parentId?: string;
  name: string;
  component: string;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  status: 'ok' | 'error';
  metadata?: Record<string, unknown>;
}

export class TracingManager {
  private spans: TraceSpan[] = [];
  private activeSpans = new Map<string, TraceSpan>();
  private readonly maxSpans = 10000;

  startSpan(name: string, component: string, parentId?: string, metadata?: Record<string, unknown>): string {
    const id = createHash('sha256').update(`${name}-${component}-${Date.now()}-${Math.random()}`).digest('hex').slice(0, 16);
    const span: TraceSpan = { id, parentId, name, component, startTime: new Date().toISOString(), status: 'ok', metadata };
    this.activeSpans.set(id, span);
    return id;
  }

  endSpan(id: string, status: 'ok' | 'error' = 'ok'): void {
    const span = this.activeSpans.get(id);
    if (!span) return;
    span.endTime = new Date().toISOString();
    span.durationMs = Date.now() - new Date(span.startTime).getTime();
    span.status = status;
    this.activeSpans.delete(id);
    this.spans.push(span);
    if (this.spans.length > this.maxSpans) this.spans.shift();
  }

  getSpans(): readonly TraceSpan[] { return this.spans; }
  getActiveSpans(): readonly TraceSpan[] { return [...this.activeSpans.values()]; }
  clear(): void { this.spans = []; this.activeSpans.clear(); }
}
