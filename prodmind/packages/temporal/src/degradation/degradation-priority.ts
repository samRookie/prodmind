import type { DegradationPoint } from '../types/index.ts';

export type PriorityLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface DegradationPriorityResult {
  priorityLevel: PriorityLevel;
  priorityScore: number;
  topConcern: string;
  actionRecommendation: string;
}

export function prioritizeDegradation(points: DegradationPoint[]): DegradationPriorityResult {
  if (points.length === 0) {
    return { priorityLevel: 'none', priorityScore: 0, topConcern: 'No degradation data', actionRecommendation: 'No action required' };
  }
  const latest = points[points.length - 1]!;
  const avgErosion = points.reduce((s, p) => s + p.erosionScore, 0) / points.length;
  const avgFragmentation = points.reduce((s, p) => s + p.fragmentationScore, 0) / points.length;
  const avgFatigue = points.reduce((s, p) => s + p.fatigueScore, 0) / points.length;
  const priorityScore = (avgErosion + avgFragmentation + avgFatigue) / 3;

  let priorityLevel: PriorityLevel;
  let topConcern: string;
  let actionRecommendation: string;

  if (priorityScore >= 0.8) {
    priorityLevel = 'critical';
    topConcern = 'Critical degradation across multiple dimensions';
    actionRecommendation = 'Immediate architectural intervention required';
  } else if (priorityScore >= 0.6) {
    priorityLevel = 'high';
    topConcern = latest.erosionScore > latest.fragmentationScore
      ? 'Erosion is primary concern'
      : 'Fragmentation is primary concern';
    actionRecommendation = 'Schedule architectural review within next cycle';
  } else if (priorityScore >= 0.4) {
    priorityLevel = 'medium';
    topConcern = 'Moderate degradation detected';
    actionRecommendation = 'Monitor degradation trends and plan incremental improvements';
  } else if (priorityScore >= 0.2) {
    priorityLevel = 'low';
    topConcern = 'Minor degradation signals';
    actionRecommendation = 'Continue routine monitoring';
  } else {
    priorityLevel = 'none';
    topConcern = 'Architecture is healthy';
    actionRecommendation = 'No action required';
  }

  return { priorityLevel, priorityScore, topConcern, actionRecommendation };
}
