import type { EvolutionPoint } from '../types/index.ts';
import { calculateVolatility } from '../utils/index.ts';

export interface DriftPersistenceResult {
  persistenceScore: number;
  sustainedDrift: boolean;
  driftDuration: number;
}

export function analyzeDriftPersistence(points: EvolutionPoint[]): DriftPersistenceResult {
  if (points.length < 2) {
    return { persistenceScore: 0, sustainedDrift: false, driftDuration: 0 };
  }
  const driftValues = points.map((p) => p.driftScore);
  const volatility = calculateVolatility(
    points.map((p) => ({ timestamp: p.timestamp, value: p.driftScore })),
  );
  const aboveThreshold = driftValues.filter((v) => v > 0.3).length;
  const driftDuration = points.length > 0
    ? new Date(points[points.length - 1]!.timestamp).getTime() -
      new Date(points.find((p) => p.driftScore > 0.3)?.timestamp ?? points[0]!.timestamp).getTime()
    : 0;
  const persistenceScore = volatility > 0 ? (aboveThreshold / points.length) * (1 - volatility) : 0;
  return {
    persistenceScore,
    sustainedDrift: aboveThreshold > points.length / 2,
    driftDuration,
  };
}
