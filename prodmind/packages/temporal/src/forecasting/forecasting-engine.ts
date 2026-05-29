import type { ForecastResult, ForecastWindow, MetricTrajectory, TemporalEvidence } from '../types/index.ts';
import { generateId, now } from '../utils/index.ts';
import { forecastComplexity } from './complexity-forecast.ts';
import { forecastRisk } from './risk-forecast.ts';

export interface ForecastingInput {
  trajectories: MetricTrajectory[];
  window: ForecastWindow;
  evidence: TemporalEvidence[];
}

export class ForecastingEngine {
  forecast(input: ForecastingInput): ForecastResult {
    const predictions = input.trajectories.map((t) => {
      if (t.metricName === 'complexity') {
        return forecastComplexity(t, input.window);
      }
      return forecastRisk(t, input.window);
    });
    const avgConfidence = predictions.length > 0
      ? predictions.reduce((s, p) => s + p.confidence, 0) / predictions.length
      : 0;
    const fingerprint = `${input.window.startTimestamp}-${input.window.endTimestamp}-${predictions.length}`;
    return {
      id: generateId(),
      projectId: '',
      createdAt: now(),
      forecastWindow: input.window,
      predictions,
      evidence: input.evidence,
      confidence: avgConfidence,
      fingerprint,
    };
  }
}
