import type { EvolutionPoint } from '../types/index.ts';
import { detectTrends, type TrendSignal } from './trend-detection.ts';
import { getTopTrends, getWorseningTrends } from './trend-ranking.ts';

export interface TrendAnalysisResult {
  allTrends: TrendSignal[];
  topTrends: TrendSignal[];
  worseningTrends: TrendSignal[];
  summary: string;
}

export class TrendEngine {
  analyze(points: EvolutionPoint[], topN: number = 5): TrendAnalysisResult {
    const allTrends = detectTrends(points);
    const top = getTopTrends(allTrends, topN);
    const worsening = getWorseningTrends(allTrends);
    const worseningNames = worsening.map((w) => w.metricName).join(', ');
    return {
      allTrends,
      topTrends: top,
      worseningTrends: worsening,
      summary: worsening.length > 0
        ? `Detected ${worsening.length} worsening trends: ${worseningNames}`
        : 'No significant worsening trends detected',
    };
  }
}
