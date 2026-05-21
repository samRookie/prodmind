import type { RuntimeExecutionRequest, RuntimePolicy, RuntimeSchedulingDecision } from '../contracts/runtime-contracts.ts';

interface QueueEntry {
  readonly request: RuntimeExecutionRequest;
  readonly submittedAt: string;
  readonly priority: number;
}

export class RuntimeScheduler {
  private queue: QueueEntry[] = [];
  private activeCount = 0;
  private readonly maxConcurrency: number;

  constructor(policy: RuntimePolicy) {
    this.maxConcurrency = policy.concurrencyLimit;
  }

  enqueue(request: RuntimeExecutionRequest, priority = 0): RuntimeSchedulingDecision {
    const entry: QueueEntry = Object.freeze({
      request,
      submittedAt: new Date().toISOString(),
      priority,
    });
    this.queue.push(entry);
    const position = this.queue.length - 1;

    return Object.freeze({
      queuePosition: position,
      queueDepth: this.queue.length,
      scheduledAt: entry.submittedAt,
      estimatedStartAt: new Date(Date.now() + position * 100).toISOString(),
      priority,
    });
  }

  dequeue(): RuntimeExecutionRequest | null {
    if (this.queue.length === 0) return null;
    if (this.activeCount >= this.maxConcurrency) return null;

    this.queue.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.submittedAt.localeCompare(b.submittedAt);
    });

    const entry = this.queue.shift()!;
    this.activeCount++;
    return entry.request;
  }

  complete(): void {
    this.activeCount = Math.max(0, this.activeCount - 1);
  }

  getQueueDepth(): number {
    return this.queue.length;
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  getMaxConcurrency(): number {
    return this.maxConcurrency;
  }

  clear(): void {
    this.queue = [];
    this.activeCount = 0;
  }
}
