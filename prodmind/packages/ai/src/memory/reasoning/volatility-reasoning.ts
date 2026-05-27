import { ReasoningChain, type ChainResult } from './reasoning-chain.ts';
import { MetricsIndexer } from '../indexing/metrics-indexer.ts';

export class VolatilityReasoning {
  private readonly _metricsIndexer: MetricsIndexer;

  constructor(metricsIndexer: MetricsIndexer) {
    this._metricsIndexer = metricsIndexer;
  }

  analyzeVolatility(nodeId: string): ChainResult {
    const chain = new ReasoningChain('instability_escalation');
    const history = this._metricsIndexer.getMetricHistory(nodeId);

    chain.addStep(`Analyzing volatility for "${nodeId}"`, [nodeId], 1.0);

    if (history.length < 2) {
      chain.addStep('Insufficient history for volatility analysis (need ≥2 data points)', [], 1.0);
      return chain.build(`Cannot determine volatility trend for "${nodeId}" — insufficient data`);
    }

    const firstInstability = history[0]!.instability;
    const lastInstability = history[history.length - 1]!.instability;
    const delta = lastInstability - firstInstability;

    chain.addStep(`Instability trend: ${firstInstability.toFixed(3)} → ${lastInstability.toFixed(3)} (Δ${delta >= 0 ? '+' : ''}${delta.toFixed(3)})`, [], 0.9);

    const sorted = [...history].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const values: number[] = sorted.map(h => h.instability);

    let maxDelta = 0;
    for (let i = 1; i < values.length; i++) {
      const d = Math.abs(values[i]! - values[i - 1]!);
      if (d > maxDelta) maxDelta = d;
    }

    chain.addStep(`Maximum single-step instability change: ${maxDelta.toFixed(3)}`, [], 0.8);

    let conclusion: string;
    if (maxDelta > 0.3) {
      conclusion = `"${nodeId}" shows high volatility (max Δ=${maxDelta.toFixed(2)}) — architecture risk`;
    } else if (delta > 0.1) {
      conclusion = `"${nodeId}" is becoming increasingly unstable (Δ=${delta.toFixed(2)})`;
    } else if (delta < -0.1) {
      conclusion = `"${nodeId}" is stabilizing (Δ=${delta.toFixed(2)})`;
    } else {
      conclusion = `"${nodeId}" is stable (Δ=${delta.toFixed(2)})`;
    }

    return chain.build(conclusion);
  }

  compareVolatility(nodeIds: readonly string[]): ChainResult {
    const chain = new ReasoningChain('instability_escalation');

    const volatilityScores = nodeIds.map(id => {
      const history = this._metricsIndexer.getMetricHistory(id);
      if (history.length < 2) return { id, score: 0 };
      const values = history.map(h => h.instability);
      const changes = values.slice(1).map((v, i) => Math.abs(v - values[i]!));
      const avgChange = changes.reduce((s, c) => s + c, 0) / changes.length;
      return { id, score: avgChange };
    }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

    chain.addStep(`Comparing volatility across ${nodeIds.length} nodes`, nodeIds, 1.0);

    const topVolatile = volatilityScores.filter(v => v.score > 0.1);
    if (topVolatile.length > 0) {
      chain.addStep(
        `Most volatile: ${topVolatile.slice(0, 5).map(v => `${v.id} (score: ${v.score.toFixed(3)})`).join(', ')}`,
        topVolatile.map(v => v.id),
        0.9,
      );
    }

    return chain.build(
      `Volatility ranking: ${volatilityScores.slice(0, 3).map(v => `${v.id} (${v.score.toFixed(3)})`).join(', ')}`,
    );
  }
}
