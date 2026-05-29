import type { BoundedPrediction } from '../types/index.ts';

export interface PredictionSchema {
  version: 1;
  metricName: string;
  currentValue: number;
  predictedValue: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  horizonMs: number;
}

export function serializePrediction(prediction: BoundedPrediction): string {
  const schema: PredictionSchema = {
    version: 1,
    metricName: prediction.metricName,
    currentValue: prediction.currentValue,
    predictedValue: prediction.predictedValue,
    lowerBound: prediction.lowerBound,
    upperBound: prediction.upperBound,
    confidence: prediction.confidence,
    horizonMs: prediction.horizonMs,
  };
  return JSON.stringify(schema);
}

export function deserializePrediction(json: string): BoundedPrediction {
  const schema = JSON.parse(json) as PredictionSchema;
  return {
    metricName: schema.metricName,
    currentValue: schema.currentValue,
    predictedValue: schema.predictedValue,
    lowerBound: schema.lowerBound,
    upperBound: schema.upperBound,
    confidence: schema.confidence,
    horizonMs: schema.horizonMs,
  };
}

export function serializePredictions(predictions: BoundedPrediction[]): string {
  return JSON.stringify(predictions.map((p) => ({
    version: 1,
    metricName: p.metricName,
    currentValue: p.currentValue,
    predictedValue: p.predictedValue,
    lowerBound: p.lowerBound,
    upperBound: p.upperBound,
    confidence: p.confidence,
    horizonMs: p.horizonMs,
  } as PredictionSchema)));
}

export function deserializePredictions(json: string): BoundedPrediction[] {
  return (JSON.parse(json) as PredictionSchema[]).map((s) => ({
    metricName: s.metricName,
    currentValue: s.currentValue,
    predictedValue: s.predictedValue,
    lowerBound: s.lowerBound,
    upperBound: s.upperBound,
    confidence: s.confidence,
    horizonMs: s.horizonMs,
  }));
}
