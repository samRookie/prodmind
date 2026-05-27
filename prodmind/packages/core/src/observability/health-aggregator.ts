export type ComponentStatus = 'healthy' | 'degraded' | 'down';

export interface HealthComponentStatus {
  status: ComponentStatus;
  lastUpdated: number;
  details: Record<string, unknown>;
}

const KNOWN_COMPONENTS = [
  'parser',
  'provider',
  'orchestration',
  'replay',
  'graph_engine',
  'memory_pressure',
  'queue_pressure',
] as const;

export type ComponentId = (typeof KNOWN_COMPONENTS)[number];

export class SystemHealthAggregator {
  private components = new Map<ComponentId, HealthComponentStatus>();

  updateComponent(
    componentId: string,
    status: ComponentStatus,
    details?: Record<string, unknown>,
  ): void {
    this.components.set(componentId as ComponentId, {
      status,
      lastUpdated: Date.now(),
      details: { ...(details ?? {}) },
    });
  }

  getComponentStatus(
    componentId: string,
  ): HealthComponentStatus | undefined {
    const entry = this.components.get(componentId as ComponentId);
    if (!entry) return undefined;
    return { ...entry, details: { ...entry.details } };
  }

  getAllStatuses(): Record<string, HealthComponentStatus> {
    const result: Record<string, HealthComponentStatus> = {};
    for (const [id, entry] of this.components) {
      result[id] = { ...entry, details: { ...entry.details } };
    }
    return result;
  }

  getOverallHealth(): ComponentStatus {
    let hasDegraded = false;

    for (const [, entry] of this.components) {
      if (entry.status === 'down') return 'down';
      if (entry.status === 'degraded') hasDegraded = true;
    }

    if (hasDegraded) return 'degraded';
    return 'healthy';
  }

  getUnhealthyComponents(): readonly string[] {
    const result: string[] = [];
    for (const [id, entry] of this.components) {
      if (entry.status === 'degraded' || entry.status === 'down') {
        result.push(id);
      }
    }
    return result;
  }

  reset(): void {
    this.components.clear();
  }
}
