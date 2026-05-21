export class ConcurrencyGovernance {
  private active = 0;
  private readonly max: number;

  constructor(maxConcurrency?: number) {
    this.max = maxConcurrency ?? 4;
  }

  tryAcquire(): boolean {
    if (this.active >= this.max) return false;
    this.active++;
    return true;
  }

  release(): void {
    if (this.active > 0) this.active--;
  }

  getActive(): number {
    return this.active;
  }

  getMax(): number {
    return this.max;
  }

  hasCapacity(): boolean {
    return this.active < this.max;
  }

  getAvailable(): number {
    return Math.max(0, this.max - this.active);
  }

  reset(): void {
    this.active = 0;
  }
}
