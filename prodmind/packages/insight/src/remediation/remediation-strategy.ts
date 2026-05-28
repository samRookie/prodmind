import type { RemediationImpact,RemediationPlan, RemediationStep } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export interface StrategyConfig {
  type: string;
  targetNodes: string[];
  description: string;
  estimatedEffort: string;
}

export function createRemediationPlan(
  insightId: string,
  config: StrategyConfig,
  steps: RemediationStep[],
  impact: RemediationImpact,
): RemediationPlan {
  return {
    id: generateId('remediation'),
    insightId,
    strategy: config.type,
    priority: impact.riskReduction > 0.7 ? 'HIGH' : impact.riskReduction > 0.4 ? 'MODERATE' : 'LOW',
    steps,
    impact,
    estimatedEffort: config.estimatedEffort,
    graphEvidence: {},
  };
}

export function suggestDependencyReduction(
  nodeId: string,
  currentDependencies: number,
): RemediationStep[] {
  const reduction = Math.ceil(currentDependencies * 0.3);
  return [
    { order: 1, action: 'identify-unused-dependencies', targetNodes: [nodeId], description: `Identify ${reduction} removable dependencies from ${nodeId}`, risk: 'low' },
    { order: 2, action: 'extract-interface', targetNodes: [nodeId], description: `Extract stable interfaces from ${nodeId}`, risk: 'medium' },
    { order: 3, action: 'reduce-fan-out', targetNodes: [nodeId], description: `Reduce fan-out by ${reduction} dependencies`, risk: 'medium' },
  ];
}

export function suggestCouplingReduction(
  nodeIds: string[],
): RemediationStep[] {
  return nodeIds.map((nodeId, i) => ({
    order: i + 1,
    action: 'reduce-coupling',
    targetNodes: [nodeId],
    description: `Refactor ${nodeId} to reduce coupling with related modules`,
    risk: 'medium',
  }));
}

export function suggestLayeringRestoration(
  violations: Array<{ nodeId: string; fromLayer: string; toLayer: string }>,
): RemediationStep[] {
  return violations.map((v, i) => ({
    order: i + 1,
    action: 'restore-layer-boundary',
    targetNodes: [v.nodeId],
    description: `Move ${v.nodeId} from ${v.fromLayer} to respect layer boundaries with ${v.toLayer}`,
    risk: 'high',
  }));
}
