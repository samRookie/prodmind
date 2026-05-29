import type { EvolutionPoint } from '../types/index.ts';
import { linearProjection } from '../utils/index.ts';

export interface DegradationForecastResult {
  projectedErosion: number;
  projectedFragmentation: number;
  projectedFatigue: number;
  confidence: number;
  bounds: { lower: number; upper: number };
}

export function forecastDegradation(
  points: EvolutionPoint[],
  targetTimestamp: string,
): DegradationForecastResult {
  if (points.length < 2) {
    return { projectedErosion: 0, projectedFragmentation: 0, projectedFatigue: 0, confidence: 0, bounds: { lower: 0, upper: 0 } };
  }
  const driftProj = linearProjection(
    points.map((p) => ({ timestamp: p.timestamp, value: p.driftScore })),
    targetTimestamp,
  );
  const couplingProj = linearProjection(
    points.map((p) => ({ timestamp: p.timestamp, value: p.coupling })),
    targetTimestamp,
  );
  const complexityProj = linearProjection(
    points.map((p) => ({ timestamp: p.timestamp, value: p.complexity })),
    targetTimestamp,
  );
  const avgConfidence = (driftProj.confidence + couplingProj.confidence + complexityProj.confidence) / 3;
  return {
    projectedErosion: driftProj.value,
    projectedFragmentation: couplingProj.value,
    projectedFatigue: complexityProj.value,
    confidence: avgConfidence,
    bounds: { lower: Math.min(driftProj.value, couplingProj.value, complexityProj.value), upper: Math.max(driftProj.value, couplingProj.value, complexityProj.value) },
  };
}
