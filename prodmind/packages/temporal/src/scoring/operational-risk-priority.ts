import type { HotspotEvolutionPoint,MetricTrajectory } from '../types/index.ts';

export interface OperationalRiskPriority {
  category: string;
  riskScore: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export function scoreOperationalRisk(
  trajectories: MetricTrajectory[],
  hotspots: HotspotEvolutionPoint[],
): OperationalRiskPriority[] {
  const results: OperationalRiskPriority[] = [];
  const instabilityMetric = trajectories.find((t) => t.metricName === 'instability');
  if (instabilityMetric) {
    const riskScore = Math.min(1, Math.abs(instabilityMetric.slope) * 10);
    results.push({
      category: 'instability',
      riskScore,
      priority: riskScore < 0.3 ? 'low' : riskScore < 0.5 ? 'medium' : riskScore < 0.7 ? 'high' : 'critical',
    });
  }
  const couplingMetric = trajectories.find((t) => t.metricName === 'coupling');
  if (couplingMetric) {
    const riskScore = Math.min(1, Math.abs(couplingMetric.slope) * 10);
    results.push({
      category: 'coupling',
      riskScore,
      priority: riskScore < 0.3 ? 'low' : riskScore < 0.5 ? 'medium' : riskScore < 0.7 ? 'high' : 'critical',
    });
  }
  if (hotspots.length > 0) {
    const avgIntensity = hotspots.reduce((s, h) => s + h.intensity, 0) / hotspots.length;
    const riskScore = Math.min(1, avgIntensity);
    results.push({
      category: 'hotspot_density',
      riskScore,
      priority: riskScore < 0.3 ? 'low' : riskScore < 0.5 ? 'medium' : riskScore < 0.7 ? 'high' : 'critical',
    });
  }
  return results;
}
