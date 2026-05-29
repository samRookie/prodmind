import type { ForecastResult } from '../types/index.ts';

export interface ForecastSchema {
  version: 1;
  id: string;
  projectId: string;
  createdAt: string;
  forecastWindow: { startTimestamp: string; endTimestamp: string; projectionCount: number; confidenceThreshold: number; bounds: { lower: number; upper: number } };
  predictions: Array<{
    metricName: string;
    currentValue: number;
    predictedValue: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
    horizonMs: number;
  }>;
  evidence: Array<{
    type: string;
    description: string;
    snapshotIds: string[];
    metricValues: Record<string, number>;
    trajectorySlope: number;
    confidence: number;
  }>;
  confidence: number;
  fingerprint: string;
}

export function serializeForecastV1(forecast: ForecastResult): string {
  const schema: ForecastSchema = {
    version: 1,
    id: forecast.id,
    projectId: forecast.projectId,
    createdAt: forecast.createdAt,
    forecastWindow: forecast.forecastWindow,
    predictions: forecast.predictions.map((p) => ({
      metricName: p.metricName,
      currentValue: p.currentValue,
      predictedValue: p.predictedValue,
      lowerBound: p.lowerBound,
      upperBound: p.upperBound,
      confidence: p.confidence,
      horizonMs: p.horizonMs,
    })),
    evidence: forecast.evidence.map((e) => ({
      type: e.type,
      description: e.description,
      snapshotIds: e.snapshotIds,
      metricValues: e.metricValues,
      trajectorySlope: e.trajectorySlope,
      confidence: e.confidence,
    })),
    confidence: forecast.confidence,
    fingerprint: forecast.fingerprint,
  };
  return JSON.stringify(schema);
}

export function deserializeForecastV1(json: string): ForecastResult {
  const schema = JSON.parse(json) as ForecastSchema;
  return {
    id: schema.id,
    projectId: schema.projectId,
    createdAt: schema.createdAt,
    forecastWindow: schema.forecastWindow,
    predictions: schema.predictions.map((p) => ({
      metricName: p.metricName,
      currentValue: p.currentValue,
      predictedValue: p.predictedValue,
      lowerBound: p.lowerBound,
      upperBound: p.upperBound,
      confidence: p.confidence,
      horizonMs: p.horizonMs,
    })),
    evidence: schema.evidence.map((e) => ({
      type: e.type,
      description: e.description,
      snapshotIds: e.snapshotIds,
      metricValues: e.metricValues,
      trajectorySlope: e.trajectorySlope,
      confidence: e.confidence,
    })),
    confidence: schema.confidence,
    fingerprint: schema.fingerprint,
  };
}
