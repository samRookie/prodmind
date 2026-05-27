type PressureLevel = 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

const ELEVATED_ACTIONS: readonly string[] = [
  'reduce_concurrency',
  'disable_noncritical_telemetry',
] as const;

const HIGH_ACTIONS: readonly string[] = [
  ...ELEVATED_ACTIONS,
  'reject_oversized_workloads',
  'trigger_cleanup',
] as const;

const CRITICAL_ACTIONS: readonly string[] = [
  ...HIGH_ACTIONS,
  'pause_admissions',
] as const;

interface PressureMetrics {
  level: string;
  categoryMetrics: Record<string, number>;
  overallPressure: number;
}

export class MemoryPressureDetector {
  private readonly normalThreshold: number;
  private readonly elevatedThreshold: number;
  private readonly highThreshold: number;

  private categoryMetrics: Record<string, number> = {};

  constructor(options?: {
    NORMAL_THRESHOLD?: number;
    ELEVATED_THRESHOLD?: number;
    HIGH_THRESHOLD?: number;
  }) {
    this.normalThreshold = options?.NORMAL_THRESHOLD ?? 0.6;
    this.elevatedThreshold = options?.ELEVATED_THRESHOLD ?? 0.75;
    this.highThreshold = options?.HIGH_THRESHOLD ?? 0.9;
  }

  updateMetric(category: string, usage: number, limit: number): void {
    const ratio = limit > 0 ? usage / limit : 0;
    this.categoryMetrics[category] = ratio;
  }

  getPressureLevel(): PressureLevel {
    const values = Object.values(this.categoryMetrics);
    if (values.length === 0) return 'NORMAL';

    const maxPressure = Math.max(...values);

    if (maxPressure >= this.highThreshold) return 'CRITICAL';
    if (maxPressure >= this.elevatedThreshold) return 'HIGH';
    if (maxPressure >= this.normalThreshold) return 'ELEVATED';
    return 'NORMAL';
  }

  getMetrics(): Readonly<PressureMetrics> {
    const values = Object.values(this.categoryMetrics);
    const overallPressure = values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;

    return Object.freeze({
      level: this.getPressureLevel(),
      categoryMetrics: Object.freeze({ ...this.categoryMetrics }),
      overallPressure,
    });
  }

  getRecommendedActions(): readonly string[] {
    const level = this.getPressureLevel();
    switch (level) {
      case 'NORMAL':
        return Object.freeze([]);
      case 'ELEVATED':
        return Object.freeze([...ELEVATED_ACTIONS]);
      case 'HIGH':
        return Object.freeze([...HIGH_ACTIONS]);
      case 'CRITICAL':
        return Object.freeze([...CRITICAL_ACTIONS]);
    }
  }

  reset(): void {
    this.categoryMetrics = {};
  }
}
