import type { BoundedPrediction,TemporalEvidence } from '../types/index.ts';
import { createTemporalEvidence } from './temporal-evidence.ts';

export function buildPredictionEvidence(
  prediction: BoundedPrediction,
): TemporalEvidence {
  return createTemporalEvidence(
    'prediction',
    `${prediction.metricName}: ${prediction.currentValue.toFixed(2)} -> ${prediction.predictedValue.toFixed(2)}`,
    [],
    { [prediction.metricName]: prediction.predictedValue },
    prediction.predictedValue - prediction.currentValue,
    prediction.confidence,
  );
}
