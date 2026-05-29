import type { BoundedPrediction } from '../types/index.ts';

export interface RankedPrediction extends BoundedPrediction {
  rank: number;
  score: number;
}

export function rankPredictions(predictions: BoundedPrediction[]): RankedPrediction[] {
  const sorted = [...predictions].sort((a, b) => {
    const scoreA = a.confidence * (1 - Math.abs(a.predictedValue - a.currentValue) / Math.max(1, a.currentValue));
    const scoreB = b.confidence * (1 - Math.abs(b.predictedValue - b.currentValue) / Math.max(1, b.currentValue));
    return scoreB - scoreA;
  });
  return sorted.map((p, i) => {
    const score = p.confidence * (1 - Math.abs(p.predictedValue - p.currentValue) / Math.max(1, p.currentValue));
    return { ...p, rank: i + 1, score };
  });
}
