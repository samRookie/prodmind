import type { ForecastResult, TemporalEvidence, TrajectoryResult } from '../types/index.ts';

export interface Explanation {
  narrative: string;
  evidence: TemporalEvidence[];
  reasoningSteps: string[];
  confidence: number;
}

export function generateTemporalExplanation(
  forecast: ForecastResult,
): Explanation {
  const predictions = forecast.predictions;
  const topPredictions = predictions.slice(0, 3);
  const narrative = `Forecast analyzes ${predictions.length} metrics across ${forecast.evidence.length} evidence sources. ` +
    `Overall confidence: ${(forecast.confidence * 100).toFixed(0)}%.`;
  const reasoningSteps = [
    `Analyzed ${forecast.evidence.length} historical evidence items`,
    `Projected ${predictions.length} metric trajectories`,
    ...topPredictions.map(
      (p) => `${p.metricName}: ${p.currentValue.toFixed(2)} -> ${p.predictedValue.toFixed(2)} (confidence: ${(p.confidence * 100).toFixed(0)}%)`,
    ),
  ];
  return {
    narrative,
    evidence: forecast.evidence,
    reasoningSteps,
    confidence: forecast.confidence,
  };
}

export function generateTrajectoryExplanation(
  trajectory: TrajectoryResult,
): Explanation {
  const metricCount = trajectory.metricTrajectories.length;
  const degDescription = `Degradation velocity: ${trajectory.degradationVelocity.toFixed(4)}`;
  const instDescription = `Instability acceleration: ${trajectory.instabilityAcceleration.toFixed(4)}`;
  const hotspotDescription = `Hotspot growth rate: ${trajectory.hotspotGrowthRate.toFixed(4)}`;
  const narrative = `Analyzed ${metricCount} metric trajectories. ${degDescription}. ${instDescription}. ${hotspotDescription}.`;
  const reasoningSteps = [
    `Computed ${metricCount} metric trajectories`,
    degDescription,
    instDescription,
    hotspotDescription,
  ];
  return {
    narrative,
    evidence: [],
    reasoningSteps,
    confidence: Math.max(0, Math.min(1, 1 - trajectory.degradationVelocity)),
  };
}
