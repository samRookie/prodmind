export interface QueueItem<T> {
  readonly id: string;
  readonly item: T;
  readonly enqueuedAt: number;
}

export class ExecutionQueue<T> {
  private readonly _queue: QueueItem<T>[] = [];
  private _maxSize: number;
  private _counter = 0;

  constructor(maxSize = 50) {
    this._maxSize = maxSize;
  }

  get maxSize(): number { return this._maxSize; }
  get length(): number { return this._queue.length; }
  get isEmpty(): boolean { return this._queue.length === 0; }
  get isFull(): boolean { return this._queue.length >= this._maxSize; }

  enqueue(item: T): boolean {
    if (this.isFull) return false;
    const queueItem: QueueItem<T> = Object.freeze({
      id: `q_${this._counter++}`,
      item,
      enqueuedAt: Date.now(),
    });
    this._queue.push(queueItem);
    return true;
  }

  dequeue(): T | undefined {
    return this._queue.shift()?.item;
  }

  peek(): T | undefined {
    return this._queue[0]?.item;
  }

  clear(): void {
    this._queue.length = 0;
  }

  get items(): readonly QueueItem<T>[] {
    return Object.freeze([...this._queue]);
  }
}
