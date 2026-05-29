import type { BoundedPrediction, ForecastWindow, TemporalEvidence } from '../types/index.ts';
import { generateId, now } from '../utils/index.ts';
import { generateBoundedPrediction } from './bounded-predictions.ts';
import { analyzeConfidence } from './confidence-analysis.ts';

export interface PredictionInput {
  metricValues: Record<string, Array<{ timestamp: string; value: number }>>;
  window: ForecastWindow;
  evidence: TemporalEvidence[];
}

export interface PredictionResult {
  id: string;
  predictions: BoundedPrediction[];
  confidence: ReturnType<typeof analyzeConfidence>;
  window: ForecastWindow;
  evidence: TemporalEvidence[];
  createdAt: string;
}

export class PredictionEngine {
  predict(input: PredictionInput): PredictionResult {
    const predictions = Object.entries(input.metricValues).map(
      ([name, values]) => generateBoundedPrediction(name, values, input.window),
    );
    return {
      id: generateId(),
      predictions,
      confidence: analyzeConfidence(predictions),
      window: input.window,
      evidence: input.evidence,
      createdAt: now(),
    };
  }
}
