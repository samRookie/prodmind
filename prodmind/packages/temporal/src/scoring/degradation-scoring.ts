export interface DegradationScore {
  score: number;
  level: 'none' | 'low' | 'moderate' | 'severe' | 'critical';
  factors: Array<{ name: string; contribution: number }>;
}

export function scoreDegradation(
  erosionScore: number,
  fragmentationScore: number,
  fatigueScore: number,
): DegradationScore {
  const score = (erosionScore + fragmentationScore + fatigueScore) / 3;
  const level = score < 0.2 ? 'none' : score < 0.4 ? 'low' : score < 0.6 ? 'moderate' : score < 0.8 ? 'severe' : 'critical';
  return {
    score,
    level,
    factors: [
      { name: 'erosion', contribution: erosionScore / Math.max(0.01, score) },
      { name: 'fragmentation', contribution: fragmentationScore / Math.max(0.01, score) },
      { name: 'fatigue', contribution: fatigueScore / Math.max(0.01, score) },
    ],
  };
}
