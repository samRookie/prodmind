import type { BoundedPrediction,ForecastResult, TemporalSnapshot } from '../types/index.ts';

export function canonicalSnapshotKeys(): Array<keyof TemporalSnapshot> {
  return ['id', 'projectId', 'timestamp', 'label', 'fingerprint', 'metadata', 'nodeCount', 'edgeCount'];
}

export function canonicalForecastKeys(): Array<keyof ForecastResult> {
  return ['id', 'projectId', 'createdAt', 'forecastWindow', 'predictions', 'evidence', 'confidence', 'fingerprint'];
}

export function canonicalPredictionKeys(): Array<keyof BoundedPrediction> {
  return ['metricName', 'currentValue', 'predictedValue', 'lowerBound', 'upperBound', 'confidence', 'horizonMs'];
}

export function canonicalizeSnapshot(snapshot: TemporalSnapshot): TemporalSnapshot {
  const canonical: TemporalSnapshot = {
    id: snapshot.id,
    projectId: snapshot.projectId,
    timestamp: snapshot.timestamp,
    label: snapshot.label,
    fingerprint: snapshot.fingerprint,
    metadata: snapshot.metadata,
    nodeCount: snapshot.nodeCount,
    edgeCount: snapshot.edgeCount,
  };
  return canonical;
}

export function canonicalizeForecast(forecast: ForecastResult): ForecastResult {
  const canonical: ForecastResult = {
    id: forecast.id,
    projectId: forecast.projectId,
    createdAt: forecast.createdAt,
    forecastWindow: forecast.forecastWindow,
    predictions: forecast.predictions.map(canonicalizePrediction),
    evidence: forecast.evidence,
    confidence: forecast.confidence,
    fingerprint: forecast.fingerprint,
  };
  return canonical;
}

export function canonicalizePrediction(prediction: BoundedPrediction): BoundedPrediction {
  return {
    metricName: prediction.metricName,
    currentValue: prediction.currentValue,
    predictedValue: prediction.predictedValue,
    lowerBound: prediction.lowerBound,
    upperBound: prediction.upperBound,
    confidence: prediction.confidence,
    horizonMs: prediction.horizonMs,
  };
}
