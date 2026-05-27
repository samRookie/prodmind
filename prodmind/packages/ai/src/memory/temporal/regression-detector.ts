import type { MetricsMemory } from '../contracts/memory-contracts.ts';

export interface RegressionSignal {
  readonly metricName: string;
  readonly previousValue: number;
  readonly currentValue: number;
  readonly percentChange: number;
  readonly severity: 'info' | 'warning' | 'critical';
  readonly message: string;
}

export class RegressionDetector {
  private readonly _signals: RegressionSignal[] = [];
  private readonly _instabilityThreshold: number;
  private readonly _propagationThreshold: number;
  private readonly _volatilityThreshold: number;

  constructor(
    instabilityThreshold = 0.1,
    propagationThreshold = 0.15,
    volatilityThreshold = 0.2,
  ) {
    this._instabilityThreshold = instabilityThreshold;
    this._propagationThreshold = propagationThreshold;
    this._volatilityThreshold = volatilityThreshold;
  }

  detectRegression(previous: MetricsMemory, current: MetricsMemory): readonly RegressionSignal[] {
    const signals: RegressionSignal[] = [];

    const instabilityDelta = current.instability - previous.instability;
    if (instabilityDelta > this._instabilityThreshold) {
      signals.push(this._createSignal('instability', previous.instability, current.instability,
        instabilityDelta > 0.3 ? 'critical' : instabilityDelta > 0.2 ? 'warning' : 'info',
        `Instability increased by ${(instabilityDelta * 100).toFixed(1)}%`));
    }

    const propagationDelta = current.propagationRisk - previous.propagationRisk;
    if (propagationDelta > this._propagationThreshold) {
      signals.push(this._createSignal('propagationRisk', previous.propagationRisk, current.propagationRisk,
        propagationDelta > 0.3 ? 'critical' : 'warning',
        `Propagation risk increased by ${(propagationDelta * 100).toFixed(1)}%`));
    }

    const volatilityDelta = current.volatility - previous.volatility;
    if (volatilityDelta > this._volatilityThreshold) {
      signals.push(this._createSignal('volatility', previous.volatility, current.volatility,
        volatilityDelta > 0.4 ? 'critical' : 'warning',
        `Volatility increased by ${(volatilityDelta * 100).toFixed(1)}%`));
    }

    for (const signal of signals) this._signals.push(signal);
    return Object.freeze(signals);
  }

  getSignals(): readonly RegressionSignal[] {
    return Object.freeze([...this._signals]);
  }

  getCriticalSignals(): readonly RegressionSignal[] {
    return Object.freeze(
      this._signals.filter(s => s.severity === 'critical')
        .sort((a, b) => b.percentChange - a.percentChange),
    );
  }

  getSignalsByMetric(metricName: string): readonly RegressionSignal[] {
    return Object.freeze(
      this._signals.filter(s => s.metricName === metricName)
        .sort((a, b) => b.percentChange - a.percentChange),
    );
  }

  clear(): void {
    this._signals.length = 0;
  }

  private _createSignal(metricName: string, previousValue: number, currentValue: number, severity: RegressionSignal['severity'], message: string): RegressionSignal {
    const percentChange = previousValue !== 0
      ? ((currentValue - previousValue) / Math.abs(previousValue)) * 100
      : currentValue * 100;
    return Object.freeze({
      metricName,
      previousValue,
      currentValue,
      percentChange,
      severity,
      message,
    });
  }
}
