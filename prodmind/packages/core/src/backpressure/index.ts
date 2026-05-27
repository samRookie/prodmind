export type PressureLevel = 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export type RejectionStrategy = 'oldest' | 'newest' | 'lowest_priority';

export interface BackpressureConfig {
  maxQueueDepth?: number;
  memoryPressureThreshold?: number;
  rejectionStrategy?: RejectionStrategy;
  highWaterMark?: number;
  lowWaterMark?: number;
}

export class BackpressureGovernor {
  private maxQueueDepth: number;
  private memoryPressureThreshold: number;
  private rejectionStrategy: RejectionStrategy;
  private highWaterMark: number;
  private lowWaterMark: number;
  private queueDepth: number = 0;
  private memoryPressure: number = 0;
  private admittedCount: number = 0;
  private rejectedCount: number = 0;

  constructor(options?: BackpressureConfig) {
    this.maxQueueDepth = options?.maxQueueDepth ?? 1000;
    this.memoryPressureThreshold = options?.memoryPressureThreshold ?? 0.8;
    this.rejectionStrategy = options?.rejectionStrategy ?? 'oldest';
    this.highWaterMark = options?.highWaterMark ?? 0.9;
    this.lowWaterMark = options?.lowWaterMark ?? 0.7;
  }

  admit(request: { id: string; priority?: number; estimatedCost?: number }): boolean {
    if (!this.isSaturated()) {
      this.admittedCount++;
      return true;
    }

    if (
      this.rejectionStrategy === 'lowest_priority' &&
      request.priority !== undefined &&
      request.priority <= 0
    ) {
      this.admittedCount++;
      return true;
    }

    this.rejectedCount++;
    return false;
  }

  updateQueueDepth(current: number): void {
    this.queueDepth = current;
  }

  updateMemoryPressure(pressure: number): void {
    this.memoryPressure = Math.max(0, Math.min(1, pressure));
  }

  isSaturated(): boolean {
    if (this.maxQueueDepth <= 0) return true;
    const queueRatio = this.queueDepth / this.maxQueueDepth;
    return queueRatio > this.highWaterMark || this.memoryPressure > this.memoryPressureThreshold;
  }

  getPressureLevel(): PressureLevel {
    const memPressure = this.memoryPressure;
    const memThreshold = this.memoryPressureThreshold;

    if (this.maxQueueDepth <= 0 || this.queueDepth >= this.maxQueueDepth || memPressure >= 1.0) return 'CRITICAL';
    const queueRatio = this.queueDepth / this.maxQueueDepth;
    if (queueRatio > this.highWaterMark || memPressure > memThreshold) return 'HIGH';
    if (queueRatio > this.lowWaterMark || memPressure > memThreshold * 0.5) return 'ELEVATED';
    return 'NORMAL';
  }

  getMetrics() {
    return Object.freeze({
      queueDepth: this.queueDepth,
      highWaterMark: this.highWaterMark,
      lowWaterMark: this.lowWaterMark,
      memoryPressure: this.memoryPressure,
      pressureLevel: this.getPressureLevel(),
      rejectedCount: this.rejectedCount,
      admittedCount: this.admittedCount,
    });
  }

  reset(): void {
    this.queueDepth = 0;
    this.memoryPressure = 0;
    this.admittedCount = 0;
    this.rejectedCount = 0;
  }
}

export class RequestScheduler {
  private queue: Array<{ id: string; priority: number; order: number }> = [];
  private capacity: number;
  private orderCounter: number = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  enqueue(request: { id: string; priority?: number }): boolean {
    if (this.queue.length >= this.capacity) return false;
    this.queue.push({ id: request.id, priority: request.priority ?? 0, order: this.orderCounter++ });
    return true;
  }

  dequeue(): { id: string; priority: number } | undefined {
    if (this.queue.length === 0) return undefined;

    let bestIdx = 0;
    for (let i = 1; i < this.queue.length; i++) {
      const a = this.queue[bestIdx]!;
      const b = this.queue[i]!;
      if (b.priority < a.priority) {
        bestIdx = i;
      } else if (b.priority === a.priority) {
        if (b.order < a.order) {
          bestIdx = i;
        }
      }
    }

    const removed = this.queue.splice(bestIdx, 1);
    return { id: removed[0]!.id, priority: removed[0]!.priority };
  }

  getQueueDepth(): number {
    return this.queue.length;
  }

  getQueueCapacity(): number {
    return this.capacity;
  }

  clear(): void {
    this.queue = [];
    this.orderCounter = 0;
  }
}
