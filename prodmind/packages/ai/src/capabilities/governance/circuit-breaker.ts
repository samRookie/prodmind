export class CircuitBreaker {
  private readonly _threshold: number;
  private readonly _resetTimeoutMs: number;
  private _failureCount = 0;
  private _lastFailureTime = 0;
  private _open = false;

  constructor(threshold: number, resetTimeoutMs: number = 30000) {
    this._threshold = threshold;
    this._resetTimeoutMs = resetTimeoutMs;
  }

  get isOpen(): boolean {
    if (!this._open) return false;
    if (Date.now() - this._lastFailureTime >= this._resetTimeoutMs) {
      this.reset();
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    this._open = false;
    this._failureCount = 0;
  }

  recordFailure(): void {
    this._failureCount++;
    this._lastFailureTime = Date.now();
    if (this._failureCount >= this._threshold) {
      this._open = true;
    }
  }

  get failureCount(): number {
    return this._failureCount;
  }

  reset(): void {
    this._failureCount = 0;
    this._lastFailureTime = 0;
    this._open = false;
  }
}
