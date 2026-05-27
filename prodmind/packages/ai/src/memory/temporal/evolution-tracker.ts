import type { EvolutionEvent, GraphMemory, MetricsMemory } from '../contracts/memory-contracts.ts';

export interface EvolutionSummary {
  readonly totalEvents: number;
  readonly graphChanges: number;
  readonly metricChanges: number;
  readonly timeRange: string;
  readonly trend: string;
}

let evolutionIdCounter = 0;

export class EvolutionTracker {
  private readonly _events: EvolutionEvent[] = [];
  private readonly _graphHistory: GraphMemory[] = [];
  private readonly _metricsHistory: MetricsMemory[] = [];

  get eventCount(): number {
    return this._events.length;
  }

  recordGraphChange(previous: GraphMemory, current: GraphMemory): readonly EvolutionEvent[] {
    const events: EvolutionEvent[] = [];

    if (previous.nodeCount !== current.nodeCount) {
      events.push(this._createEvent('hotspot_growth', current.snapshotId,
        String(previous.nodeCount), String(current.nodeCount)));
    }
    if (previous.edgeCount !== current.edgeCount) {
      events.push(this._createEvent('dependency_change', current.snapshotId,
        String(previous.edgeCount), String(current.edgeCount)));
    }
    if (previous.sccCount !== current.sccCount) {
      events.push(this._createEvent('scc_change', current.snapshotId,
        String(previous.sccCount), String(current.sccCount)));
    }

    this._graphHistory.push(current);
    for (const event of events) this._events.push(event);
    return Object.freeze([...events]);
  }

  recordMetricChange(previous: MetricsMemory, current: MetricsMemory): readonly EvolutionEvent[] {
    const events: EvolutionEvent[] = [];

    if (Math.abs(previous.instability - current.instability) > 0.01) {
      events.push(this._createEvent('instability_change', current.snapshotId,
        previous.instability.toFixed(3), current.instability.toFixed(3)));
    }
    if (Math.abs(previous.propagationRisk - current.propagationRisk) > 0.01) {
      events.push(this._createEvent('propagation_risk_change', current.snapshotId,
        previous.propagationRisk.toFixed(3), current.propagationRisk.toFixed(3)));
    }
    if (Math.abs(previous.volatility - current.volatility) > 0.01) {
      events.push(this._createEvent('metric_evolution', current.snapshotId,
        previous.volatility.toFixed(3), current.volatility.toFixed(3)));
    }

    this._metricsHistory.push(current);
    for (const event of events) this._events.push(event);
    return Object.freeze([...events]);
  }

  getEvents(): readonly EvolutionEvent[] {
    return Object.freeze([...this._events]);
  }

  getEventsByType(eventType: string): readonly EvolutionEvent[] {
    return Object.freeze(
      this._events.filter(e => e.eventType === eventType)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    );
  }

  getGraphHistory(): readonly GraphMemory[] {
    return Object.freeze([...this._graphHistory]);
  }

  getMetricsHistory(): readonly MetricsMemory[] {
    return Object.freeze([...this._metricsHistory]);
  }

  getSummary(): EvolutionSummary {
    const graphChanges = this._events.filter(e =>
      ['hotspot_growth', 'dependency_change', 'scc_change'].includes(e.eventType),
    ).length;
    const metricChanges = this._events.filter(e =>
      ['instability_change', 'propagation_risk_change', 'metric_evolution'].includes(e.eventType),
    ).length;
    const timestamps = this._events.map(e => e.timestamp).sort();
    const timeRange = timestamps.length > 0 ? `${timestamps[0]} → ${timestamps[timestamps.length - 1]}` : '';

    const trend = graphChanges + metricChanges > 10 ? 'high activity' :
      graphChanges + metricChanges > 3 ? 'moderate activity' : 'low activity';

    return Object.freeze({
      totalEvents: this._events.length,
      graphChanges,
      metricChanges,
      timeRange,
      trend,
    });
  }

  clear(): void {
    this._events.length = 0;
    this._graphHistory.length = 0;
    this._metricsHistory.length = 0;
  }

  private _createEvent(eventType: string, snapshotId: string, previousState: string, newState: string): EvolutionEvent {
    evolutionIdCounter++;
    return Object.freeze({
      id: `evol_${evolutionIdCounter}`,
      eventType,
      nodeId: snapshotId,
      previousState,
      newState,
      timestamp: '',
      snapshotId,
    });
  }
}
