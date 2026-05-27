type BudgetCategory = 'heap' | 'graph' | 'queue' | 'replay' | 'provider_response';

interface CategoryUsage {
  allocated: number;
  peak: number;
  limit: number;
  percentage: number;
}

interface TotalUsage {
  allocated: number;
  peak: number;
  percentage: number;
}

const MB = 1024 * 1024;

export class ResourceBudgetManager {
  private limits: Record<string, number>;
  private allocations: Record<string, number>;
  private peaks: Record<string, number>;

  constructor(options?: {
    maxHeapMB?: number;
    maxGraphMemoryMB?: number;
    maxQueueMemoryMB?: number;
    maxReplayStorageMB?: number;
  }) {
    const {
      maxHeapMB = 512,
      maxGraphMemoryMB = 256,
      maxQueueMemoryMB = 128,
      maxReplayStorageMB = 1024,
    } = options ?? {};

    this.limits = {
      heap: maxHeapMB * MB,
      graph: maxGraphMemoryMB * MB,
      queue: maxQueueMemoryMB * MB,
      replay: maxReplayStorageMB * MB,
      provider_response: 0,
    };

    this.allocations = {};
    this.peaks = {};
  }

  trackAllocation(category: BudgetCategory, bytes: number): boolean {
    this.ensureCategory(category);
    const limit = this.getLimit(category);
    this.allocations[category] = (this.allocations[category] ?? 0) + bytes;
    if ((this.allocations[category] ?? 0) > (this.peaks[category] ?? 0)) {
      this.peaks[category] = this.allocations[category];
    }
    if ((this.allocations[category] ?? 0) > limit) {
      return false;
    }
    return true;
  }

  trackDeallocation(category: string, bytes: number): void {
    this.ensureCategory(category);
    const current = this.allocations[category];
    this.allocations[category] = Math.max(0, (current ?? 0) - bytes);
  }

  getUsage(category: string): Readonly<CategoryUsage> {
    this.ensureCategory(category);
    return this.makeUsage(category);
  }

  getAllUsage(): Readonly<Record<string, Readonly<CategoryUsage>>> {
    const result: Record<string, CategoryUsage> = {};
    for (const category of Object.keys(this.limits)) {
      result[category] = this.makeUsage(category);
    }
    return Object.freeze(result);
  }

  getTotalUsage(): Readonly<TotalUsage> {
    let allocated = 0;
    let peak = 0;
    for (const category of Object.keys(this.limits)) {
      this.ensureCategory(category);
      allocated += this.allocations[category] ?? 0;
      peak += this.peaks[category] ?? 0;
    }
    const totalLimit = Object.values(this.limits).reduce((a, b) => a + b, 0);
    return Object.freeze({
      allocated,
      peak,
      percentage: totalLimit > 0 ? (allocated / totalLimit) * 100 : 0,
    });
  }

  reset(): void {
    this.allocations = {};
    this.peaks = {};
  }

  resetCategory(category: string): void {
    if (this.allocations[category] !== undefined) {
      this.allocations[category] = 0;
    }
    if (this.peaks[category] !== undefined) {
      this.peaks[category] = 0;
    }
  }

  private ensureCategory(category: string): void {
    if (this.allocations[category] === undefined) {
      this.allocations[category] = 0;
    }
    if (this.peaks[category] === undefined) {
      this.peaks[category] = 0;
    }
  }

  private getLimit(category: string): number {
    if (this.limits[category] === undefined) {
      this.limits[category] = 0;
    }
    return this.limits[category];
  }

  private makeUsage(category: string): Readonly<CategoryUsage> {
    const limit = this.getLimit(category);
    return Object.freeze({
      allocated: this.allocations[category] ?? 0,
      peak: this.peaks[category] ?? 0,
      limit,
      percentage: limit > 0 ? ((this.allocations[category] ?? 0) / limit) * 100 : 0,
    });
  }
}
