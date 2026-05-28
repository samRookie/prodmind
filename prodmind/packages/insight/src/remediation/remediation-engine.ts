import type { RemediationPlan, RemediationStep } from '../types/index.ts';
import { estimateRemediationImpact } from './remediation-impact-analysis.ts';
import { prioritizeRemediations } from './remediation-prioritization.ts';
import { createRemediationPlan, suggestCouplingReduction, suggestDependencyReduction, suggestLayeringRestoration } from './remediation-strategy.ts';

export class RemediationEngine {
  generate(params: {
    insightId: string;
    type: string;
    targetNodes: string[];
    currentRisk?: number;
    currentComplexity?: number;
    currentCoupling?: number;
    layerViolations?: Array<{ nodeId: string; fromLayer: string; toLayer: string }>;
  }): RemediationPlan {
    const impact = estimateRemediationImpact(
      params.currentRisk ?? 0.5,
      params.currentComplexity ?? 0.5,
      params.currentCoupling ?? 0.5,
    );
    let steps: RemediationStep[];
    switch (params.type) {
      case 'dependency-reduction':
        steps = suggestDependencyReduction(params.targetNodes[0]!, params.currentCoupling ? Math.ceil(params.currentCoupling * 20) : 10);
        break;
      case 'coupling-reduction':
        steps = suggestCouplingReduction(params.targetNodes);
        break;
      case 'layering-restoration':
        steps = suggestLayeringRestoration(params.layerViolations ?? []);
        break;
      default:
        steps = [{ order: 1, action: 'review', targetNodes: params.targetNodes, description: `Review ${params.targetNodes.join(', ')}`, risk: 'medium' }];
    }
    return createRemediationPlan(
      params.insightId,
      { type: params.type, targetNodes: params.targetNodes, description: `${params.type} for ${params.targetNodes.join(', ')}`, estimatedEffort: 'medium' },
      steps,
      impact,
    );
  }

  prioritize(plans: RemediationPlan[]): RemediationPlan[] {
    return prioritizeRemediations(plans);
  }
}
