import type { PropagationIntelligence } from '../types/index.ts';
import { estimateBlastRadius } from './blast-radius-analysis.ts';
import { analyzeCascade } from './cascade-analysis.ts';
import { assessTransitiveRisk } from './influence-analysis.ts';

export class PropagationIntelligenceEngine {
  analyze(params: {
    blastRadius?: { nodeId: string; transitiveDependents: string[] };
    cascade?: { rootNode: string; cascadeChain: string[]; probability: number };
    transitive?: { nodeId: string; transitivePath: string[]; pathLength: number };
  }): PropagationIntelligence[] {
    const results: PropagationIntelligence[] = [];
    if (params.blastRadius) {
      results.push(estimateBlastRadius(params.blastRadius.nodeId, params.blastRadius.transitiveDependents));
    }
    if (params.cascade) {
      results.push(analyzeCascade(params.cascade.rootNode, params.cascade.cascadeChain, params.cascade.probability));
    }
    if (params.transitive) {
      results.push(assessTransitiveRisk(params.transitive.nodeId, params.transitive.transitivePath, params.transitive.pathLength));
    }
    return results;
  }
}
