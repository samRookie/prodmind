import type { MetricsMemory, VolatilityEvent } from '../contracts/memory-contracts.ts';

export interface VolatilitySpike {
  readonly metricId: string;
  readonly metricName: string;
  readonly previousValue: number;
  readonly newValue: number;
  readonly magnitude: number;
  readonly timestamp: string;
}

let volatilityIdCounter = 0;

export class VolatilityTracker {
  private readonly _events: VolatilityEvent[] = [];
  private readonly _spikes: VolatilitySpike[] = [];
  private readonly _threshold: number;

  constructor(spikeThreshold = 0.2) {
    this._threshold = spikeThreshold;
  }

  get threshold(): number {
    return this._threshold;
  }

  get eventCount(): number {
    return this._events.length;
  }

  get spikeCount(): number {
    return this._spikes.length;
  }

  recordChange(previous: MetricsMemory, current: MetricsMemory): readonly VolatilityEvent[] {
    const events: VolatilityEvent[] = [];

    const instabilityChange = current.instability - previous.instability;
    if (Math.abs(instabilityChange) > 0.001) {
      const event = this._createEvent(current.id, 'instability', previous.instability, current.instability);
      events.push(event);
      if (Math.abs(instabilityChange) > this._threshold) {
        this._spikes.push(Object.freeze({
          metricId: current.id,
          metricName: 'instability',
          previousValue: previous.instability,
          newValue: current.instability,
          magnitude: Math.abs(instabilityChange),
          timestamp: current.timestamp,
        }));
      }
    }

    const propagationChange = current.propagationRisk - previous.propagationRisk;
    if (Math.abs(propagationChange) > 0.001) {
      const event = this._createEvent(current.id, 'propagationRisk', previous.propagationRisk, current.propagationRisk);
      events.push(event);
      if (Math.abs(propagationChange) > this._threshold) {
        this._spikes.push(Object.freeze({
          metricId: current.id,
          metricName: 'propagationRisk',
          previousValue: previous.propagationRisk,
          newValue: current.propagationRisk,
          magnitude: Math.abs(propagationChange),
          timestamp: current.timestamp,
        }));
      }
    }

    const volatilityChange = current.volatility - previous.volatility;
    if (Math.abs(volatilityChange) > 0.001) {
      const event = this._createEvent(current.id, 'volatility', previous.volatility, current.volatility);
      events.push(event);
      if (Math.abs(volatilityChange) > this._threshold) {
        this._spikes.push(Object.freeze({
          metricId: current.id,
          metricName: 'volatility',
          previousValue: previous.volatility,
          newValue: current.volatility,
          magnitude: Math.abs(volatilityChange),
          timestamp: current.timestamp,
        }));
      }
    }

    for (const event of events) this._events.push(event);
    return Object.freeze([...events]);
  }

  getEvents(): readonly VolatilityEvent[] {
    return Object.freeze([...this._events]);
  }

  getSpikes(): readonly VolatilitySpike[] {
    return Object.freeze([...this._spikes]);
  }

  getSpikesAboveThreshold(threshold: number): readonly VolatilitySpike[] {
    return Object.freeze(
      this._spikes.filter(s => s.magnitude >= threshold)
        .sort((a, b) => b.magnitude - a.magnitude),
    );
  }

  clear(): void {
    this._events.length = 0;
    this._spikes.length = 0;
  }

  private _createEvent(nodeId: string, metricName: string, oldValue: number, newValue: number): VolatilityEvent {
    volatilityIdCounter++;
    return Object.freeze({
      id: `vol_${volatilityIdCounter}`,
      nodeId,
      metricName,
      oldValue,
      newValue,
      changeMagnitude: Math.abs(newValue - oldValue),
      timestamp: '',
      snapshotId: '',
    });
  }
}
